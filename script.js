function mostrarSubida() {
  document.getElementById('modalSubida').classList.remove('oculto');
}
function ocultarSubida() {
  document.getElementById('modalSubida').classList.add('oculto');
  document.getElementById('preview').innerHTML = '';
}
function subirTodas() {
  const files = document.getElementById('inputImagenes').files;
  if (!files.length) return;
  [...files].forEach(file => {
    const formData = new FormData();
    formData.append('foto', file);
    fetch('/subir', {
      method: 'POST',
      body: formData
    }).then(res => res.json()).then(data => {
      console.log('Subido:', data.url);
    });
  });
  ocultarSubida();
}
document.getElementById('inputImagenes').addEventListener('change', (e) => {
  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  [...e.target.files].forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});
