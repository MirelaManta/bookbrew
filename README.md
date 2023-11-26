# BookBrew - A Personal Bookshelf Web Application

BookBrew is a web application built with Express.js, PostgreSQL, and Axios, designed to help you manage and track your book collection. This README provides an overview of the project structure, features, and instructions for getting started.

## Introduction

BookBrew is a personal bookshelf application that allows users to manage and explore their literary collection. The application provides features such as viewing books, adding new entries, editing book details, and sorting the book list based on different criteria.

## Project Structure

The project follows a modular structure with separate views for different functionalities. Here's a brief overview of the main files:

- `index.js`: Main server file with the Express.js setup, database connection, and route definitions.
- `views/index.ejs`: Homepage displaying the list of books with sorting options.
- `views/about.ejs`: About page, offering insights into the creator and the purpose of BookBrew.
- `views/add-book.ejs`: Form for adding new books to the collection.
- `views/edit-book.ejs`: Form for editing existing book details.
- `public/`: Directory containing static assets such as images and styles.
- `partials/`: Directory containing reusable EJS partials for headers and footers.

## Features

- View a list of books with details like title, author, read date, rating, and notes.
- Sort the book list by recency or rating.
- Add new books to the collection with information such as title, author, ISBN, read date, rating, and notes.
- Edit existing book details, including updating information and adding or removing notes.
- Explore the creator's literary journey on the "About" page.
- User Authentication (Coming Soon): In future updates, we plan to implement user authentication to enhance the security and privacy of your book collection. Once authentication is added, only authorized users will have the ability to add, edit, or delete books from the collection. Stay tuned for these exciting enhancements!

## Getting Started

### Prerequisites

Ensure that the following software is installed on your machine:

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/MirelaManta/bookbrew.git
   ```

2. Navigate to the project directory:

   ```bash
   cd bookbrew
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

### Configuration

1. Create a `.env` file in the root of the project:

   ```plaintext
   DB_USER=your_postgres_user
   DB_HOST=your_postgres_host
   DB_DATABASE=books
   DB_PASSWORD=your_postgres_password
   DB_PORT=your_postgres_port
   ```

   Replace `your_postgres_user`, `your_postgres_host`, `your_postgres_password`, and `your_postgres_port` with your PostgreSQL database credentials.

2. Update the PostgreSQL configuration in `index.js` if necessary.

## Usage

### Running the Application

Start the application using the following command:

```bash
npm start
```

### Accessing the Application

Open a web browser and go to [http://localhost:3000](http://localhost:3000) to access BookBrew.
