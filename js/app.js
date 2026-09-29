"use strict";

document.addEventListener("DOMContentLoaded", iniciarFormularioContacto);

function iniciarFormularioContacto() {

    const formulario =
        document.querySelector("#formularioContactanos");

    const boton =
        document.querySelector("#botonEnvio");

    const estado =
        document.querySelector("#estadoFormulario");

    if (!formulario || !boton || !estado) {
        return;
    }

    formulario.addEventListener("submit", enviarFormulario);

    async function enviarFormulario(evento) {

        evento.preventDefault();

        if (!formulario.checkValidity()) {
            formulario.reportValidity();
            return;
        }

        const textoOriginal = boton.textContent;

        boton.disabled = true;
        boton.textContent = "Enviando...";

        estado.hidden = true;
        estado.className = "estadoFormulario";
        estado.textContent = "";

        try {

            const datos = new FormData(formulario);

            const respuesta = await fetch(
                formulario.action,
                {
                    method: "POST",
                    body: datos
                }
            );

            const tipoContenido =
                respuesta.headers.get("content-type") || "";

            if (!tipoContenido.includes("application/json")) {
                throw new Error(
                    "La respuesta del servidor no es válida."
                );
            }

            const resultado = await respuesta.json();

            if (!respuesta.ok || !resultado.success) {
                throw new Error(
                    resultado.message ||
                    "No se pudo enviar el formulario."
                );
            }

            mostrarEstado(
                "exito",
                "Solicitud enviada",
                "Hemos recibido tus datos. Nuestro equipo se pondrá en contacto contigo lo antes posible."
            );

            formulario.reset();

        } catch (error) {

            console.error(
                "Error al enviar el formulario:",
                error
            );

            mostrarEstado(
                "error",
                "No se ha podido enviar",
                "Ha ocurrido un problema. Inténtalo de nuevo en unos minutos."
            );

        } finally {

            boton.disabled = false;
            boton.textContent = textoOriginal;
        }
    }

    function mostrarEstado(tipo, titulo, mensaje) {

        estado.className =
            `estadoFormulario estadoFormulario--${tipo}`;

        estado.innerHTML = `
            <strong>${titulo}</strong>
            <span>${mensaje}</span>
        `;

        estado.hidden = false;
    }
}