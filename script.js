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
// Al cambiar imágenes en input
input.addEventListener('change', e => {
  const files = e.target.files;
  if (files.length > 4) alert('Máximo 4 imágenes');
  preview.innerHTML = '';
  [...files].forEach(file => {
    if (!['image/png','image/jpeg'].includes(file.type)) return alert('Formato no válido');
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.width = 100; img.height = 100;
    preview.appendChild(img);
  });
});
