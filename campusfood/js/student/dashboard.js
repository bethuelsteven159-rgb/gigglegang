export function renderStudentName() {
  const username = sessionStorage.getItem('username') || 'Student';
  const name = document.getElementById('studentName');
  const welcome = document.getElementById('studentNameWelcome');

  if (name) name.textContent = username;
  if (welcome) welcome.textContent = username;
}
