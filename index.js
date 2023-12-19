import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const app = express();
const port = 3001;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", async (req, res) => {
  // Capture the sort query parameter or default to "read_date"
  const sort = req.query.sort || "read_date";
  let orderBy;

  switch (sort) {
    case "rating":
      orderBy = "ratings.rating DESC, books.read_date DESC";
      break;
    case 'recency':
    default:
      orderBy = 'books.read_date DESC';
      break;
  }

  try {
    const client = await pool.connect();
    const queryText = `
      SELECT 
        books.id, 
        books.title, 
        books.author, 
        books.isbn, 
        books.read_date, 
        ratings.rating, 
        array_agg(notes.note_text) as notes   
      FROM books
      LEFT JOIN ratings ON books.id = ratings.book_id
      LEFT JOIN notes ON books.id = notes.book_id
      GROUP BY books.id, ratings.rating
      ORDER BY ${orderBy};
    `;
    // array_agg(notes.note_text) creates an array of notes associeted with each book
    const result = await client.query(queryText);
    const books = result.rows;
    client.release();

    for (let book of books) {
      if (book.isbn) { // Only try if the book has an ISBN number
        try {
          const url = `http://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`;
          await axios.get(url); // Make a request to the Open Library API
          book.cover_image_url = url; // If successful, set the book's cover image URL
        } catch (error) {
          book.cover_image_url = "/images/default-cover.jpg"; 
        }
      }
    }
    res.render("index.ejs", { books, sort });
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.get("/edit-book/:id", async (req, res) => {
  const bookId = req.params.id;
  try {
    const client = await pool.connect();
    const bookResult = await client.query('SELECT * FROM books WHERE id = $1', [bookId]);
    if (bookResult.rowCount === 0) {
      client.release();
      return res.status(404).send("Book not found.");
    }
    const book = bookResult.rows[0];
    client.release();
    res.render("edit-book.ejs", { book }); // Render the form with the book data
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error when fetching book details.");
  }
});

app.post("/update-book/:id", async (req, res) => {
  const bookId = req.params.id;
  const { title, author, isbn, read_date, rating, notes } = req.body;

  // Convert rating to an integer, or null if it's not provided or invalid
  const ratingInt = rating ? parseInt(rating, 10) : null;  // if rating not null, undefined, 0, NaN, or an empty string, parse as base-10 int

  // Start validation
  if (!title || !author) {
    return res.status(400).send("Title and author are required.");
  }

  if (isbn && !/^\d{10}(\d{3})?$/.test(isbn)) {
    return res.status(400).send("Invalid ISBN format. ISBN must be 10 or 13 digits.");
  }

  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).send("Rating must be between 1 and 5.");
  }

  // If notes are an array (from a dynamic form where users can add multiple notes)
  if (notes && Array.isArray(notes)) {
    for (const noteText of notes) {
      if (typeof noteText !== 'string' || noteText.trim() === '') {
        return res.status(400).send("Note text must be a non-empty string.");
      }
    }
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN"); // Start a transaction

    // Update book details
    const updateBookQuery = `
    UPDATE books 
    SET title = $1, author = $2, isbn = $3, read_date = $4
    WHERE id = $5;
    `;
    await client.query(updateBookQuery, [title, author, isbn || null, read_date, bookId]);

    const existingNotesResult = await client.query("SELECT * FROM notes WHERE book_id = $1", [bookId]);
    const existingNotes = existingNotesResult.rows;

    if (Array.isArray(notes)) {
      // Update or insert notes logic
      notes.forEach(async (noteText, index) => {
        if (existingNotes[index]) {
          // Update existing note
          if (noteText !== existingNotes[index].note_text) {
            await client.query("UPDATE notes SET note_text = $1 WHERE id = $2", [noteText, existingNotes[index].id]);
          }
        } else {
          // Insert new note
          await client.query("INSERT INTO notes (book_id, note_text) VALUES ($1, $2)", [bookId, noteText]);
        }
      });

      // Delete notes that were removed by the user
      const notesToDelete = existingNotes.slice(notes.length);
      notesToDelete.forEach(async (note) => {
        await client.query("DELETE FROM notes WHERE id = $1", [note.id]);
      });
    }

    // Update or insert the rating logic, modified to handle null values
    const checkRatingExistsQuery = "SELECT * FROM ratings WHERE book_id = $1;";
    const ratingResult = await client.query(checkRatingExistsQuery, [bookId]);

    if (ratingInt !== null) {
      if (ratingResult.rowCount > 0) {
        // If a rating exists, update it
        const updateRatingQuery = "UPDATE ratings SET rating = $1 WHERE book_id = $2;";
        await client.query(updateRatingQuery, [ratingInt, bookId]);
      } else {
        // If no rating exists, insert a new one
        const insertRatingQuery = "INSERT INTO ratings (book_id, rating) VALUES ($1, $2);";
        await client.query(insertRatingQuery, [bookId, ratingInt]);
      }
    } else {
      // If the rating is null, and a rating previously existed, delete it
      if (ratingResult.rowCount > 0) {
        const deleteRatingQuery = "DELETE FROM ratings WHERE book_id = $1;";
        await client.query(deleteRatingQuery, [bookId]);
      }
      // If the rating is null and no previous rating existed, do nothing
    }

      await client.query("COMMIT"); 
      res.redirect("/"); 

    } catch (err) {
      console.error(err);
      if (client) {
        await client.query("ROLLBACK"); 
      } 
      res.status(500).send("Server error when updating book.");

    } finally {
      if (client) {
        client.release();
      }
    }
});


app.get("/add", (req, res) => {
  res.render("add-book.ejs");
});

app.post("/add-book", async (req, res) => {
  try {
    const { title, author, isbn, read_date, rating, notes } = req.body;

    // Validate the input data
    if (!title || !author) {
      return res.status(400).send("Title and author are required.");
    }

    if (isbn && !/^\d{10}(\d{3})?$/.test(isbn)) {
      return res.status(400).send("Invalid ISBN format.");
    }
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).send("Rating must be between 1 and 5.");
    }

    const client = await pool.connect();
    const insertBookQuery = `
      INSERT INTO books (title, author, isbn, read_date)
      VALUES ($1, $2, $3, $4) RETURNING id;
    `;
    const insertBookParams = [title, author, isbn, read_date || null];
    const insertBookResult = await client.query(insertBookQuery, insertBookParams);
    const bookId = insertBookResult.rows[0].id;

    if (notes) {
      const insertNotesQuery = "INSERT INTO notes (book_id, note_text) VALUES ($1, $2);";
      await client.query(insertNotesQuery, [bookId, notes]);
    }
    if (rating) {
      const insertRatingQuery = "INSERT INTO ratings (book_id, rating) VALUES ($1, $2);";
      await client.query(insertRatingQuery, [bookId, rating]);
    }
    client.release();

    res.redirect('/'); 
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error when adding the book.");
  }
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});


app.listen(port, () => {
  console.log(`Server is running on http://127.0.0.1:${port}.`);
});