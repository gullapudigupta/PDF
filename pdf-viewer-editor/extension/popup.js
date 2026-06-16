document.getElementById('openPdf').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf';

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('PDF selected:', file.name);
    }
  });

  input.click();
});
