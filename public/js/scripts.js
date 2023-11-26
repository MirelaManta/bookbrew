
function addNote() {
  const notesContainer = document.getElementById('notes-container');
  const newNoteIndex = document.querySelectorAll('.form-group textarea').length;
  
  const newFormGroup = document.createElement('div');
  newFormGroup.classList.add('form-group');

  const newLabel = document.createElement('label');
  newLabel.htmlFor = 'notes_' + newNoteIndex;
  newLabel.textContent = 'Note ' + (newNoteIndex + 1);
  newFormGroup.appendChild(newLabel);

  const newTextArea = document.createElement('textarea');
  newTextArea.id = 'notes_' + newNoteIndex;
  newTextArea.name = 'notes';
  newFormGroup.appendChild(newTextArea);

  notesContainer.appendChild(newFormGroup);
}

