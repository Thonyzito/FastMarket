function registrarCompra() {
  fetch('/comprar', { method: 'POST' })
    .then(() => actualizarContador());
}
function actualizarContador() {
  fetch('/total')
    .then(res => res.json())
    .then(data => {
      document.getElementById('contador').textContent = 'Ventas: ' + data.total;
    });
}
document.addEventListener('DOMContentLoaded', actualizarContador);
document.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", () => {
    alert("Producto agregado al carrito (ficticio)");
  });
});