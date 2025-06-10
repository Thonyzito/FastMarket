// Variables
const btnSubirImg = document.getElementById('btnSubirImg');
const modalImagenes = document.getElementById('modalImagenes');
const inputImagenes = document.getElementById('inputImagenes');
const preview = document.getElementById('preview');
const btnAgregar = document.getElementById('btnAgregar');
const checkoutForm = document.getElementById('checkoutForm');

let imagenesSeleccionadas = [];

// Mostrar modal de subir imágenes
btnSubirImg.addEventListener('click', () => {
  modalImagenes.classList.remove('oculto');
  checkoutForm.classList.add('oculto');
  preview.innerHTML = '';
  imagenesSeleccionadas = [];
  inputImagenes.value = '';
});

// Previsualizar imágenes y validar
inputImagenes.addEventListener('change', () => {
  preview.innerHTML = '';
  imagenesSeleccionadas = [];
  const files = Array.from(inputImagenes.files);

  if (files.length > 4) {
    alert('Solo puedes subir máximo 4 imágenes.');
    inputImagenes.value = '';
    return;
  }

  files.forEach(file => {
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('Solo formatos PNG y JPG permitidos.');
      inputImagenes.value = '';
      preview.innerHTML = '';
      return;
    }
  });

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      preview.appendChild(img);
      imagenesSeleccionadas.push(file);
    };
    reader.readAsDataURL(file);
  });
});

// Al hacer click en agregar, ocultar modal y mostrar formulario
btnAgregar.addEventListener('click', () => {
  if (imagenesSeleccionadas.length === 0) {
    alert('Selecciona al menos una imagen antes de agregar.');
    return;
  }
  modalImagenes.classList.add('oculto');
  checkoutForm.classList.remove('oculto');
});

// Al enviar formulario, validar y enviar imágenes + datos
checkoutForm.addEventListener('submit', async e => {
  e.preventDefault();

  // Validación básica con HTML5 required

  // Crear formData con campos + imágenes
  const formData = new FormData();
  formData.append('nombre', checkoutForm.nombre.value);
  formData.append('direccion', checkoutForm.direccion.value);
  formData.append('correo', checkoutForm.correo.value);
  formData.append('telefono', checkoutForm.telefono.value);
  formData.append('tarjeta', checkoutForm.tarjeta.value);
  formData.append('cvc', checkoutForm.cvc.value);
  formData.append('vencimiento', checkoutForm.vencimiento.value);

  imagenesSeleccionadas.forEach((file, i) => {
    formData.append('imagenes', file);
  });

  try {
    const res = await fetch('/comprar-personalizado', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      alert('Compra realizada con éxito.');
      checkoutForm.reset();
      preview.innerHTML = '';
      imagenesSeleccionadas = [];
      checkoutForm.classList.add('oculto');
    } else {
      alert('Error al guardar la compra.');
    }
  } catch (err) {
    alert('Error en la petición.');
  }
});

// Carrito HUD
const carritoHUD = document.getElementById('carritoHUD');
const listaCarrito = document.getElementById('listaCarrito');
const btnVaciar = document.getElementById('btnVaciar');

let carrito = [];

document.querySelectorAll('.producto button:not([id="btnSubirImg"])').forEach((btn, i) => {
  btn.addEventListener('click', () => {
    const nombre = btn.closest('.producto').querySelector('h2').innerText;
    const precioText = btn.closest('.producto').querySelector('p').innerText;
    carrito.push({ nombre, precio: precioText });
    actualizarHUD();
  });
});

function actualizarHUD() {
  if (carrito.length === 0) {
    carritoHUD.classList.add('oculto');
    return;
  }
  carritoHUD.classList.remove('oculto');
  listaCarrito.innerHTML = '';
  carrito.forEach((item, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${item.nombre}</span>
      <span>${item.precio}</span>
      <button onclick="quitarCarrito(${idx})" style="margin-left:10px; background:red; color:white; border:none;">Eliminar</button>
    `;  // <- cerrar aquí el template literal
    listaCarrito.appendChild(li);
  });
}


window.quitarCarrito = function(i) {
  carrito.splice(i, 1);
  actualizarHUD();
};
btnVaciar.addEventListener('click', () => {
  carrito = [];
  actualizarHUD();
});
