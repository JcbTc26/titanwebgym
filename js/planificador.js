"use strict";

/* =========================================================
   TITAN FITNESS CLUB
   PLANIFICADOR DE ENTRENAMIENTO

   Este archivo:
   1. Recoge los datos del formulario.
   2. Valida la información.
   3. Comprueba alertas de seguridad.
   4. Genera una rutina según las selecciones.
   5. Muestra el resultado.
   6. Guarda el último plan en localStorage.
========================================================= */

const utilidadesPlanificador = {
    limpiarTexto(valor) {
        return String(valor || "")
            .trim()
            .replace(/\s+/g, " ");
    },

    capitalizar(texto) {
        if (!texto) {
            return "";
        }

        return (
            texto.charAt(0).toUpperCase() +
            texto.slice(1)
        );
    },

    formatearLista(elementos) {
        if (elementos.length === 0) {
            return "";
        }

        if (elementos.length === 1) {
            return elementos[0];
        }

        return (
            elementos.slice(0, -1).join(", ") +
            " y " +
            elementos[elementos.length - 1]
        );
    },

    escaparHTML(valor) {
        return String(valor)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    },

    contienePalabras(texto, palabras) {
        const textoNormalizado = texto.toLowerCase();

        return palabras.some((palabra) =>
            textoNormalizado.includes(
                palabra.toLowerCase()
            )
        );
    },

    obtenerNombreObjetivo(objetivo) {
        const objetivos = {
            salud: "Salud general",
            "perder-grasa": "Perder grasa",
            "ganar-fuerza": "Ganar fuerza",
            "masa-muscular": "Masa muscular",
            resistencia: "Resistencia",
            movilidad: "Movilidad"
        };

        return objetivos[objetivo] || objetivo;
    },

    obtenerNombreLugar(lugar) {
        const lugares = {
            casa: "Casa sin material",
            "casa-material": "Casa con material",
            gimnasio: "Gimnasio"
        };

        return lugares[lugar] || lugar;
    },

    crearDatoResumen(titulo, valor) {
        return `
            <div class="datoResumen">

                <strong>
                    ${utilidadesPlanificador.escaparHTML(titulo)}
                </strong>

                <span>
                    ${utilidadesPlanificador.escaparHTML(valor)}
                </span>

            </div>
        `;
    }
};

document.addEventListener("DOMContentLoaded", iniciarPlanificador);

/* =========================================================
   FUNCIÓN PRINCIPAL
========================================================= */

function iniciarPlanificador() {

    /* Elementos principales del formulario */
    const formulario = document.querySelector("#formularioPlan");
    const erroresFormulario =
        document.querySelector("#erroresFormulario");

    /* Elementos del resultado */
    const resultadoPlan = document.querySelector("#resultadoPlan");
    const resumenUsuario = document.querySelector("#resumenUsuario");
    const avisoResultado = document.querySelector("#avisoResultado");
    const contenidoPlan = document.querySelector("#contenidoPlan");

    /* Botones */
    const botonImprimir = document.querySelector("#botonImprimir");
    const botonEliminar = document.querySelector("#botonEliminar");
    const botonLimpiar = document.querySelector("#botonLimpiar");

    /* Checkbox Ninguna */
    const sinLimitaciones =
        document.querySelector("#sinLimitaciones");

    /* Todos los checkbox de limitaciones */
    const checkboxesLimitaciones = [
        ...document.querySelectorAll(
            'input[name="limitaciones"]'
        )
    ];

    /* Clave usada para guardar el plan */
    const CLAVE_PLAN = "titanFitnessPlan";

    /* Comprueba que el HTML necesario existe */
    if (
        !formulario ||
        !erroresFormulario ||
        !resultadoPlan ||
        !resumenUsuario ||
        !avisoResultado ||
        !contenidoPlan
    ) {
        console.error(
            "No se encontraron todos los elementos del planificador."
        );

        return;
    }

    /* Configura el comportamiento de los checkbox */
    configurarCheckboxesLimitaciones();

    /* Recupera un plan anterior, si existe */
    cargarPlanGuardado();

    /* Evento para generar el plan */
    formulario.addEventListener("submit", generarPlanDesdeFormulario);

    /* Evento para imprimir */
    botonImprimir?.addEventListener("click", () => {
        window.print();
    });

    /* Evento para eliminar el plan */
    botonEliminar?.addEventListener("click", eliminarPlan);

    /* Evento para limpiar el resultado */
    botonLimpiar?.addEventListener("click", () => {
        limpiarResultado();
        limpiarErrores();
    });

    /* =====================================================
       CONFIGURACIÓN DE LIMITACIONES
    ====================================================== */

    function configurarCheckboxesLimitaciones() {

        checkboxesLimitaciones.forEach((checkbox) => {

            checkbox.addEventListener("change", () => {

                /*
                 * Si se selecciona Ninguna, se desmarcan
                 * las demás limitaciones.
                 */
                if (
                    checkbox.value === "ninguna" &&
                    checkbox.checked
                ) {
                    checkboxesLimitaciones.forEach((elemento) => {

                        if (elemento.value !== "ninguna") {
                            elemento.checked = false;
                        }

                    });

                    return;
                }

                /*
                 * Si se selecciona cualquier limitación,
                 * se desmarca Ninguna.
                 */
                if (
                    checkbox.value !== "ninguna" &&
                    checkbox.checked &&
                    sinLimitaciones
                ) {
                    sinLimitaciones.checked = false;
                }

            });

        });

    }

    /* =====================================================
       ENVÍO DEL FORMULARIO
    ====================================================== */

    function generarPlanDesdeFormulario(evento) {

        /* Evita que el formulario recargue la página */
        evento.preventDefault();

        /* Limpia errores anteriores */
        limpiarErrores();

        /* Obtiene los datos */
        const datos = obtenerDatosFormulario();

        /* Valida los datos */
        const errores = validarDatos(datos);

        if (errores.length > 0) {
            mostrarErrores(errores);
            return;
        }

        /*
         * Si existen alertas importantes, no se genera
         * una rutina automática.
         */
        if (datos.alertas.length > 0) {
            mostrarBloqueoSeguridad(datos);
            return;
        }

        /* Genera la rutina */
        const plan = generarPlan(datos);

        /* Muestra el resultado */
        mostrarPlan(plan);

        /* Guarda el resultado */
        guardarPlan(plan);

        /* Desplaza la pantalla hasta el resultado */
        resultadoPlan.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

    /* =====================================================
       OBTENER DATOS DEL FORMULARIO
    ====================================================== */

    function obtenerDatosFormulario() {

        const datosFormulario = new FormData(formulario);

        return {
            nombre:
                utilidadesPlanificador.limpiarTexto(
                    datosFormulario.get("nombre")
                ) || "Deportista",

            edad: Number(datosFormulario.get("edad")),

            peso: Number(datosFormulario.get("peso")),

            altura: Number(datosFormulario.get("altura")),

            actividad:
                String(datosFormulario.get("actividad") || ""),

            experiencia:
                String(datosFormulario.get("experiencia") || ""),

            objetivo:
                String(datosFormulario.get("objetivo") || ""),

            dias: Number(datosFormulario.get("dias")),

            duracion: Number(datosFormulario.get("duracion")),

            lugar:
                String(datosFormulario.get("lugar") || ""),

            limitaciones:
                datosFormulario
                    .getAll("limitaciones")
                    .map(String)
                    .filter((valor) => valor !== "ninguna"),

            alertas:
                datosFormulario
                    .getAll("alertas")
                    .map(String),

            aceptaAviso:
                document.querySelector("#aceptarAviso")?.checked === true
        };

    }

    /* =====================================================
       VALIDACIÓN
    ====================================================== */

    function validarDatos(datos) {

        const errores = [];

        if (
            !Number.isInteger(datos.edad) ||
            datos.edad < 18 ||
            datos.edad > 80
        ) {
            errores.push(
                "Introduce una edad comprendida entre 18 y 80 años."
            );
        }

        if (
            !Number.isFinite(datos.peso) ||
            datos.peso < 35 ||
            datos.peso > 250
        ) {
            errores.push(
                "Introduce un peso comprendido entre 35 y 250 kg."
            );
        }

        if (
            !Number.isFinite(datos.altura) ||
            datos.altura < 130 ||
            datos.altura > 230
        ) {
            errores.push(
                "Introduce una altura comprendida entre 130 y 230 cm."
            );
        }

        if (!datos.actividad) {
            errores.push("Selecciona tu actividad habitual.");
        }

        if (!datos.experiencia) {
            errores.push("Selecciona tu nivel de experiencia.");
        }

        if (!datos.objetivo) {
            errores.push("Selecciona tu objetivo principal.");
        }

        if (![2, 3, 4, 5].includes(datos.dias)) {
            errores.push("Selecciona entre 2 y 5 días.");
        }

        if (![30, 45, 60, 75].includes(datos.duracion)) {
            errores.push("Selecciona una duración válida.");
        }

        if (
            !["casa", "casa-material", "gimnasio"]
                .includes(datos.lugar)
        ) {
            errores.push("Selecciona el lugar de entrenamiento.");
        }

        if (!datos.aceptaAviso) {
            errores.push(
                "Debes aceptar que el plan es orientativo."
            );
        }

        return errores;

    }

    /* =====================================================
       MOSTRAR ERRORES
    ====================================================== */

    function mostrarErrores(errores) {

        erroresFormulario.innerHTML = `
            <strong>Revisa los siguientes campos:</strong>

            <ul>
                ${errores
                    .map(
                        (error) =>
                            `<li>${utilidadesPlanificador.escaparHTML(error)}</li>`
                    )
                    .join("")}
            </ul>
        `;

        erroresFormulario.hidden = false;

        /* Lleva el foco al primer campo HTML inválido */
        formulario.querySelector(":invalid")?.focus();

    }

    function limpiarErrores() {
        erroresFormulario.hidden = true;
        erroresFormulario.innerHTML = "";
    }

    /* =====================================================
       BLOQUEO DE SEGURIDAD
    ====================================================== */

    function mostrarBloqueoSeguridad(datos) {

        const nombresAlertas = {
            "dolor-pecho":
                "dolor en el pecho durante la actividad",

            mareos:
                "mareos, desmayos o falta de aire inusual",

            "lesion-reciente":
                "una lesión, operación o dolor intenso reciente",

            "condicion-medica":
                "una condición cardiovascular o una limitación médica"
        };

        const alertas = datos.alertas
            .map((alerta) => nombresAlertas[alerta])
            .filter(Boolean);

        resultadoPlan.hidden = false;

        resumenUsuario.innerHTML = `
            ${utilidadesPlanificador.crearDatoResumen("Usuario", datos.nombre)}

            ${utilidadesPlanificador.crearDatoResumen(
                "Estado",
                "Valoración profesional recomendada"
            )}
        `;

        avisoResultado.innerHTML = `
            <p>
                <strong>
                    No se ha generado una rutina automática.
                </strong>
            </p>

            <p>
                Has indicado ${utilidadesPlanificador.escaparHTML(
                    utilidadesPlanificador.formatearLista(alertas)
                )}.
                Consulta con un profesional sanitario o del ejercicio
                antes de comenzar o modificar un entrenamiento.
            </p>
        `;

        contenidoPlan.innerHTML = "";

        resultadoPlan.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

    /* =====================================================
       GENERACIÓN DEL PLAN
    ====================================================== */

    function generarPlan(datos) {

        /* Calcula el IMC solo como referencia */
        const imc = calcularIMC(datos.peso, datos.altura);

        /* Obtiene series y descansos */
        const configuracion = crearConfiguracion(datos);

        /* Obtiene la biblioteca del lugar elegido */
        const ejercicios =
            crearBibliotecaEjercicios(datos.lugar);

        /* Crea las sesiones del objetivo */
        const sesionesDisponibles =
            crearSesionesPorObjetivo(
                datos,
                ejercicios
            );

        /* Usa únicamente el número de días solicitado */
        const sesiones = sesionesDisponibles
            .slice(0, datos.dias)
            .map((sesion, indice) => {

                const ejerciciosAdaptados = sesion.ejercicios
                    .map((ejercicio) =>
                        adaptarEjercicio(
                            ejercicio,
                            datos,
                            configuracion
                        )
                    )
                    .slice(0, configuracion.maxEjercicios);

                return {
                    numero: indice + 1,
                    titulo: sesion.titulo,
                    descripcion: sesion.descripcion,
                    ejercicios: ejerciciosAdaptados
                };

            });

        return {
            creadoEn: new Date().toISOString(),
            usuario: datos,
            imc,
            configuracion,
            sesiones
        };

    }

    /* =====================================================
       CÁLCULO ORIENTATIVO DEL IMC
    ====================================================== */

    function calcularIMC(peso, alturaCentimetros) {

        const alturaMetros = alturaCentimetros / 100;

        return Number(
            (
                peso /
                (alturaMetros * alturaMetros)
            ).toFixed(1)
        );

    }

    /* =====================================================
       CONFIGURACIÓN SEGÚN EXPERIENCIA
    ====================================================== */

    function crearConfiguracion(datos) {

        const niveles = {
            principiante: {
                series: 2,
                repeticiones: "8-12",
                descanso: "75-90 s",
                intensidad: "Suave-moderada",
                maxEjercicios: 6
            },

            intermedio: {
                series: 3,
                repeticiones: "8-12",
                descanso: "60-90 s",
                intensidad: "Moderada",
                maxEjercicios: 7
            },

            avanzado: {
                series: 4,
                repeticiones: "6-12",
                descanso: "90-120 s",
                intensidad: "Moderada-alta",
                maxEjercicios: 8
            }
        };

        const configuracion = {
            ...niveles[datos.experiencia]
        };

        /* Reduce la cantidad en sesiones cortas */
        if (datos.duracion === 30) {
            configuracion.maxEjercicios =
                Math.min(configuracion.maxEjercicios, 5);
        }

        /* Aumenta ligeramente en sesiones largas */
        if (datos.duracion >= 60) {
            configuracion.maxEjercicios += 1;
        }

        /* Ajuste conservador para personas mayores */
        if (datos.edad >= 65) {
            configuracion.series =
                Math.min(configuracion.series, 3);

            configuracion.descanso = "90-120 s";
            configuracion.intensidad = "Suave-moderada";
        }

        /* Ajuste para una persona sedentaria */
        if (datos.actividad === "sedentaria") {
            configuracion.intensidad = "Suave-moderada";
        }

        /* Ajustes según objetivo */
        if (datos.objetivo === "ganar-fuerza") {

            configuracion.repeticiones =
                datos.experiencia === "principiante"
                    ? "8-10"
                    : "5-8";

            configuracion.descanso =
                datos.experiencia === "principiante"
                    ? "90 s"
                    : "120-180 s";
        }

        if (datos.objetivo === "masa-muscular") {
            configuracion.repeticiones = "8-12";
            configuracion.descanso = "60-90 s";
        }

        return configuracion;

    }

    /* =====================================================
       BIBLIOTECA DE EJERCICIOS
    ====================================================== */

    function crearBibliotecaEjercicios(lugar) {

        const bibliotecas = {

            /* Ejercicios sin material */
            casa: {
                sentadilla: crearEjercicio(
                    "Sentadilla a una silla",
                    "Desciende con control hasta tocar la silla y vuelve a levantarte.",
                    "Fuerza"
                ),

                pierna: crearEjercicio(
                    "Step-up en escalón bajo",
                    "Sube y baja alternando las piernas con apoyo cercano.",
                    "Fuerza"
                ),

                bisagra: crearEjercicio(
                    "Bisagra de cadera",
                    "Lleva la cadera hacia atrás manteniendo la espalda neutra.",
                    "Fuerza"
                ),

                gluteo: crearEjercicio(
                    "Puente de glúteos",
                    "Eleva la cadera sin arquear excesivamente la espalda.",
                    "Fuerza"
                ),

                empuje: crearEjercicio(
                    "Flexiones inclinadas",
                    "Apoya las manos en una superficie estable.",
                    "Fuerza"
                ),

                tiron: crearEjercicio(
                    "Remo isométrico con toalla",
                    "Tira de la toalla en direcciones opuestas.",
                    "Fuerza"
                ),

                hombro: crearEjercicio(
                    "Elevación de brazos en pared",
                    "Desliza los brazos lentamente sin forzar.",
                    "Movilidad"
                ),

                core: crearEjercicio(
                    "Bird dog",
                    "Extiende brazo y pierna contrarios manteniendo estabilidad.",
                    "Core"
                )
            },

            /* Ejercicios con mancuernas o bandas */
            "casa-material": {
                sentadilla: crearEjercicio(
                    "Sentadilla goblet",
                    "Sujeta una mancuerna cerca del pecho.",
                    "Fuerza"
                ),

                pierna: crearEjercicio(
                    "Zancada hacia atrás",
                    "Controla el paso y mantén el tronco estable.",
                    "Fuerza"
                ),

                bisagra: crearEjercicio(
                    "Peso muerto rumano con mancuernas",
                    "Mantén las cargas cerca de las piernas.",
                    "Fuerza"
                ),

                gluteo: crearEjercicio(
                    "Puente de glúteos con carga",
                    "Eleva la cadera con una carga ligera.",
                    "Fuerza"
                ),

                empuje: crearEjercicio(
                    "Press de pecho con mancuernas",
                    "Controla el descenso y evita arquear la espalda.",
                    "Fuerza"
                ),

                tiron: crearEjercicio(
                    "Remo con mancuernas",
                    "Lleva los codos hacia atrás sin balancearte.",
                    "Fuerza"
                ),

                hombro: crearEjercicio(
                    "Press de hombros con mancuernas",
                    "Usa una carga cómoda y controlada.",
                    "Fuerza"
                ),

                core: crearEjercicio(
                    "Dead bug",
                    "Mueve brazo y pierna contrarios sin despegar la zona lumbar.",
                    "Core"
                )
            },

            /* Ejercicios de gimnasio */
            gimnasio: {
                sentadilla: crearEjercicio(
                    "Sentadilla goblet o multipower",
                    "Utiliza una carga que permita mantener la técnica.",
                    "Fuerza"
                ),

                pierna: crearEjercicio(
                    "Prensa de piernas",
                    "Evita bloquear completamente las rodillas.",
                    "Fuerza"
                ),

                bisagra: crearEjercicio(
                    "Peso muerto rumano con mancuernas",
                    "Lleva la cadera atrás manteniendo la espalda neutra.",
                    "Fuerza"
                ),

                gluteo: crearEjercicio(
                    "Hip thrust",
                    "Eleva la cadera sin hiperextender la espalda.",
                    "Fuerza"
                ),

                empuje: crearEjercicio(
                    "Press de pecho en máquina",
                    "Ajusta el asiento y controla la bajada.",
                    "Fuerza"
                ),

                tiron: crearEjercicio(
                    "Remo sentado en polea",
                    "Tira hacia el torso sin balancearte.",
                    "Fuerza"
                ),

                hombro: crearEjercicio(
                    "Press de hombros en máquina",
                    "Evita elevar los hombros hacia las orejas.",
                    "Fuerza"
                ),

                core: crearEjercicio(
                    "Pallof press",
                    "Evita la rotación del tronco.",
                    "Core"
                )
            }
        };

        const base = bibliotecas[lugar];

        return {
            ...base,

            calentamiento: crearEjercicio(
                "Calentamiento general",
                "Movilidad suave y actividad progresiva.",
                "Calentamiento",
                "7-10 min"
            ),

            cardio: crearEjercicio(
                lugar === "gimnasio"
                    ? "Bicicleta, cinta o elíptica"
                    : "Caminata rápida",
                "Mantén un ritmo moderado y controlado.",
                "Cardio",
                "20-30 min"
            ),

            cardioCorto: crearEjercicio(
                lugar === "gimnasio"
                    ? "Cardio final en máquina"
                    : "Marcha rápida",
                "Finaliza sin llegar al agotamiento.",
                "Cardio",
                "8-12 min"
            ),

            intervalos: crearEjercicio(
                lugar === "gimnasio"
                    ? "Intervalos en bicicleta"
                    : "Intervalos caminando",
                "Alterna un minuto moderado y dos suaves.",
                "Cardio",
                "18-25 min"
            ),

            movilidad: crearEjercicio(
                "Movilidad global",
                "Moviliza tobillos, caderas, columna y hombros.",
                "Movilidad",
                "8-12 min"
            ),

            equilibrio: crearEjercicio(
                "Equilibrio con apoyo",
                "Mantén una pierna elevada cerca de un apoyo estable.",
                "Equilibrio",
                "2-3 × 20 s"
            ),

            recuperacion: crearEjercicio(
                "Vuelta a la calma",
                "Reduce el ritmo y respira con normalidad.",
                "Recuperación",
                "5 min"
            )
        };

    }

    /* =====================================================
       SESIONES SEGÚN OBJETIVO
    ====================================================== */

    function crearSesionesPorObjetivo(datos, ejercicios) {

        const sesiones = {

            salud: [
                crearSesion(
                    "Cuerpo completo A",
                    "Fuerza general y control del movimiento.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.empuje,
                        ejercicios.tiron,
                        ejercicios.bisagra,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Cardio y movilidad",
                    "Actividad aeróbica moderada.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.cardio,
                        ejercicios.movilidad,
                        ejercicios.equilibrio,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Cuerpo completo B",
                    "Segunda sesión global.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.pierna,
                        ejercicios.hombro,
                        ejercicios.tiron,
                        ejercicios.gluteo,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Cardio progresivo",
                    "Trabajo cardiovascular controlado.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.intervalos,
                        ejercicios.movilidad,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Técnica y recuperación",
                    "Sesión moderada de consolidación.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.empuje,
                        ejercicios.tiron,
                        ejercicios.equilibrio,
                        ejercicios.recuperacion
                    ]
                )
            ],

            "perder-grasa": [
                crearSesion(
                    "Fuerza metabólica A",
                    "Cuerpo completo con descansos controlados.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.empuje,
                        ejercicios.tiron,
                        ejercicios.bisagra,
                        ejercicios.core,
                        ejercicios.cardioCorto
                    ]
                ),

                crearSesion(
                    "Cardio moderado",
                    "Trabajo aeróbico progresivo.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.cardio,
                        ejercicios.movilidad,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Fuerza metabólica B",
                    "Segunda sesión de cuerpo completo.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.pierna,
                        ejercicios.hombro,
                        ejercicios.tiron,
                        ejercicios.gluteo,
                        ejercicios.core,
                        ejercicios.cardioCorto
                    ]
                ),

                crearSesion(
                    "Intervalos moderados",
                    "Cambios de ritmo controlados.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.intervalos,
                        ejercicios.movilidad,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Circuito global",
                    "Fuerza general y movimiento continuo.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.empuje,
                        ejercicios.tiron,
                        ejercicios.pierna,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                )
            ],

            "ganar-fuerza": [
                crearSesion(
                    "Tren inferior",
                    "Piernas, glúteos y estabilidad.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.bisagra,
                        ejercicios.pierna,
                        ejercicios.gluteo,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Tren superior",
                    "Empujes y tirones.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.empuje,
                        ejercicios.tiron,
                        ejercicios.hombro,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Cuerpo completo",
                    "Movimientos fundamentales.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.empuje,
                        ejercicios.tiron,
                        ejercicios.bisagra,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Piernas complementarias",
                    "Trabajo unilateral y glúteos.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.pierna,
                        ejercicios.gluteo,
                        ejercicios.bisagra,
                        ejercicios.equilibrio,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Superior complementario",
                    "Volumen moderado de torso.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.tiron,
                        ejercicios.empuje,
                        ejercicios.hombro,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                )
            ],

            "masa-muscular": [
                crearSesion(
                    "Piernas y glúteos",
                    "Volumen moderado de tren inferior.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.pierna,
                        ejercicios.bisagra,
                        ejercicios.gluteo,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Pecho y hombros",
                    "Trabajo de empuje.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.empuje,
                        ejercicios.hombro,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Espalda y core",
                    "Trabajo de tracción y estabilidad.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.tiron,
                        ejercicios.bisagra,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Cuerpo completo",
                    "Volumen equilibrado.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.empuje,
                        ejercicios.tiron,
                        ejercicios.gluteo,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Complementos",
                    "Trabajo accesorio y movilidad.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.pierna,
                        ejercicios.hombro,
                        ejercicios.core,
                        ejercicios.movilidad,
                        ejercicios.recuperacion
                    ]
                )
            ],

            resistencia: [
                crearSesion(
                    "Cardio continuo",
                    "Ritmo estable y controlado.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.cardio,
                        ejercicios.core,
                        ejercicios.movilidad,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Fuerza resistente",
                    "Cuerpo completo.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.empuje,
                        ejercicios.tiron,
                        ejercicios.pierna,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Intervalos progresivos",
                    "Cambios de ritmo moderados.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.intervalos,
                        ejercicios.movilidad,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Circuito aeróbico",
                    "Movimientos encadenados.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.tiron,
                        ejercicios.gluteo,
                        ejercicios.cardioCorto,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Recuperación activa",
                    "Actividad suave.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.cardio,
                        ejercicios.movilidad,
                        ejercicios.recuperacion
                    ]
                )
            ],

            movilidad: [
                crearSesion(
                    "Movilidad global A",
                    "Caderas, hombros y columna.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.movilidad,
                        ejercicios.equilibrio,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Fuerza básica",
                    "Movimientos lentos y controlados.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.tiron,
                        ejercicios.gluteo,
                        ejercicios.core,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Movilidad global B",
                    "Amplitud y estabilidad.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.movilidad,
                        ejercicios.pierna,
                        ejercicios.equilibrio,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Cardio suave",
                    "Actividad de bajo impacto.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.cardio,
                        ejercicios.movilidad,
                        ejercicios.recuperacion
                    ]
                ),

                crearSesion(
                    "Control corporal",
                    "Estabilidad y coordinación.",
                    [
                        ejercicios.calentamiento,
                        ejercicios.sentadilla,
                        ejercicios.gluteo,
                        ejercicios.core,
                        ejercicios.equilibrio,
                        ejercicios.recuperacion
                    ]
                )
            ]
        };

        return sesiones[datos.objetivo];

    }

    /* =====================================================
       ADAPTACIÓN DE EJERCICIOS
    ====================================================== */

    function adaptarEjercicio(
        ejercicio,
        datos,
        configuracion
    ) {

        const adaptado = {
            ...ejercicio,

            series: ejercicio.duracion
                ? null
                : configuracion.series,

            repeticiones: ejercicio.duracion
                ? ejercicio.duracion
                : configuracion.repeticiones,

            descanso: ejercicio.duracion
                ? null
                : configuracion.descanso
        };

        /* Sustitución por molestias de rodilla */
        if (
            datos.limitaciones.includes("rodilla") &&
            utilidadesPlanificador.contienePalabras(adaptado.nombre, [
                "zancada",
                "step-up"
            ])
        ) {
            return {
                nombre: "Sentarse y levantarse de una silla",
                descripcion:
                    "Utiliza una silla estable y un recorrido cómodo.",
                tipo: "Fuerza adaptada",
                series: 2,
                repeticiones: "6-10",
                descanso: "90 s"
            };
        }

        /* Sustitución por molestias de espalda */
        if (
            datos.limitaciones.includes("espalda") &&
            utilidadesPlanificador.contienePalabras(adaptado.nombre, [
                "peso muerto",
                "bisagra"
            ])
        ) {
            return {
                nombre: "Puente de glúteos sin carga",
                descripcion:
                    "Eleva la cadera lentamente y detente si aparece dolor.",
                tipo: "Fuerza adaptada",
                series: 2,
                repeticiones: "8-12",
                descanso: "90 s"
            };
        }

        /* Sustitución por molestias de hombro */
        if (
            datos.limitaciones.includes("hombro") &&
            utilidadesPlanificador.contienePalabras(adaptado.nombre, [
                "press de hombros",
                "elevación de brazos"
            ])
        ) {
            return {
                nombre: "Retracción escapular suave",
                descripcion:
                    "Lleva los hombros suavemente hacia atrás.",
                tipo: "Movilidad adaptada",
                series: 2,
                repeticiones: "8-10",
                descanso: "60 s"
            };
        }

        /* Adaptación de cardio por movilidad reducida */
        if (
            datos.limitaciones.includes("movilidad") &&
            adaptado.tipo === "Cardio"
        ) {
            adaptado.nombre =
                datos.lugar === "gimnasio"
                    ? "Bicicleta reclinada suave"
                    : "Marcha suave con apoyo";

            adaptado.descripcion =
                "Mantén una intensidad cómoda y prioriza la estabilidad.";
        }

        /* Aviso añadido a mayores de 65 años */
        if (datos.edad >= 65) {
            adaptado.descripcion +=
                " Mantén un apoyo estable cerca.";
        }

        return adaptado;

    }

    /* =====================================================
       CREACIÓN DE OBJETOS
    ====================================================== */

    function crearEjercicio(
        nombre,
        descripcion,
        tipo,
        duracion = null
    ) {
        return {
            nombre,
            descripcion,
            tipo,
            duracion
        };
    }

    function crearSesion(
        titulo,
        descripcion,
        ejercicios
    ) {
        return {
            titulo,
            descripcion,
            ejercicios
        };
    }

    /* =====================================================
       MOSTRAR EL PLAN
    ====================================================== */

    function mostrarPlan(plan) {

        resultadoPlan.hidden = false;

        const datos = plan.usuario;

        resumenUsuario.innerHTML = `
            ${utilidadesPlanificador.crearDatoResumen(
                "Usuario",
                datos.nombre
            )}

            ${utilidadesPlanificador.crearDatoResumen(
                "Plan",
                `${datos.dias} días · ${datos.duracion} minutos`
            )}

            ${utilidadesPlanificador.crearDatoResumen(
                "Objetivo",
                utilidadesPlanificador.obtenerNombreObjetivo(datos.objetivo)
            )}

            ${utilidadesPlanificador.crearDatoResumen(
                "Nivel",
                utilidadesPlanificador.capitalizar(datos.experiencia)
            )}

            ${utilidadesPlanificador.crearDatoResumen(
                "Lugar",
                utilidadesPlanificador.obtenerNombreLugar(datos.lugar)
            )}

            ${utilidadesPlanificador.crearDatoResumen(
                "Intensidad",
                plan.configuracion.intensidad
            )}

            ${utilidadesPlanificador.crearDatoResumen(
                "IMC orientativo",
                String(plan.imc)
            )}

            ${utilidadesPlanificador.crearDatoResumen(
                "Actividad",
                utilidadesPlanificador.capitalizar(datos.actividad)
            )}
        `;

        avisoResultado.innerHTML =
            crearAvisoResultado(plan);

        contenidoPlan.innerHTML = plan.sesiones
            .map(crearHTMLSesion)
            .join("");

    }

    /* =====================================================
       HTML DE CADA SESIÓN
    ====================================================== */

    function crearHTMLSesion(sesion) {

        return `
            <article class="diaEntrenamiento">

                <header class="cabeceraDia">

                    <span>Día ${sesion.numero}</span>

                    <h3>${utilidadesPlanificador.escaparHTML(sesion.titulo)}</h3>

                    <p>
                        ${utilidadesPlanificador.escaparHTML(sesion.descripcion)}
                    </p>

                </header>

                <div class="listaEjercicios">

                    ${sesion.ejercicios
                        .map(crearHTMLEjercicio)
                        .join("")}

                </div>

            </article>
        `;

    }

    /* =====================================================
       HTML DE CADA EJERCICIO
    ====================================================== */

   function crearHTMLEjercicio(ejercicio) {

    const nombreSeguro =
        utilidadesPlanificador.escaparHTML(ejercicio.nombre);

    const descripcionSegura =
        utilidadesPlanificador.escaparHTML(ejercicio.descripcion);

    const rutaImagen =
        imagenesEjercicios[ejercicio.nombre];

    const imagenHTML = rutaImagen
        ? `
            <div class="imagenEjercicio">
                <img
                    src="${rutaImagen}"
                    alt="Ilustración del ejercicio ${nombreSeguro}"
                    loading="lazy"
                    decoding="async"
                    width="320"
                    height="320"
                >
            </div>
        `
        : "";

    return `
        <div class="ejercicioPlan">

            ${imagenHTML}

            <div class="informacionEjercicio">
                <h4>${nombreSeguro}</h4>
                <p>${descripcionSegura}</p>
            </div>

            <div class="datosEjercicio">

                ${
                    ejercicio.series
                        ? `
                            <span>
                                <strong>Series:</strong>
                                ${ejercicio.series}
                            </span>
                        `
                        : ""
                }

                ${
                    ejercicio.repeticiones
                        ? `
                            <span>
                                <strong>Repeticiones:</strong>
                                ${ejercicio.repeticiones}
                            </span>
                        `
                        : ""
                }

                ${
                    ejercicio.duracion
                        ? `
                            <span>
                                <strong>Duración:</strong>
                                ${utilidadesPlanificador.escaparHTML(
                                    ejercicio.duracion
                                )}
                            </span>
                        `
                        : ""
                }

                ${
                    ejercicio.descanso
                        ? `
                            <span>
                                <strong>Descanso:</strong>
                                ${utilidadesPlanificador.escaparHTML(
                                    ejercicio.descanso
                                )}
                            </span>
                        `
                        : ""
                }

            </div>

        </div>
    `;
}

    /* =====================================================
       AVISO ORIENTATIVO
    ====================================================== */

    function crearAvisoResultado(plan) {

        const mensajes = [];

        mensajes.push(
            `Comienza con una intensidad ${plan.configuracion.intensidad.toLowerCase()} y prioriza una técnica controlada.`
        );

        if (plan.usuario.actividad === "sedentaria") {
            mensajes.push(
                "Durante las primeras semanas puedes reducir una serie o acortar las sesiones."
            );
        }

        if (plan.usuario.edad >= 65) {
            mensajes.push(
                "Se ha incluido trabajo de equilibrio y una intensidad conservadora."
            );
        }

        if (plan.usuario.limitaciones.length > 0) {
            mensajes.push(
                "Se han realizado sustituciones generales según las limitaciones indicadas."
            );
        }

        mensajes.push(
            "El IMC se muestra como referencia y no determina por sí solo tu nivel físico."
        );

        return mensajes
            .map(
                (mensaje) =>
                    `<p>${utilidadesPlanificador.escaparHTML(mensaje)}</p>`
            )
            .join("");

    }

    /* =====================================================
       LOCALSTORAGE
    ====================================================== */

    function guardarPlan(plan) {

        try {
            localStorage.setItem(
                CLAVE_PLAN,
                JSON.stringify(plan)
            );
        } catch (error) {
            console.warn(
                "No se pudo guardar el plan.",
                error
            );
        }

    }

    function cargarPlanGuardado() {

        try {
            const contenido =
                localStorage.getItem(CLAVE_PLAN);

            if (!contenido) {
                return;
            }

            const plan = JSON.parse(contenido);

            if (
                !plan ||
                !plan.usuario ||
                !Array.isArray(plan.sesiones)
            ) {
                localStorage.removeItem(CLAVE_PLAN);
                return;
            }

            mostrarPlan(plan);

        } catch (error) {
            console.warn(
                "El plan guardado no es válido.",
                error
            );

            localStorage.removeItem(CLAVE_PLAN);
        }

    }

    function eliminarPlan() {

        localStorage.removeItem(CLAVE_PLAN);

        limpiarResultado();

        formulario.reset();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

    function limpiarResultado() {

        resultadoPlan.hidden = true;

        resumenUsuario.innerHTML = "";
        avisoResultado.innerHTML = "";
        contenidoPlan.innerHTML = "";

    }

    /* =====================================================
       FUNCIONES AUXILIARES
    ====================================================== */

    /*
     * Utilidades compartidas: se mantienen aquí para
     * priorizar claridad y evitar duplicación de lógica.
     */

}

const imagenesEjercicios = {
    "Sentadilla a una silla":
        "/img/ejercicios/01-sentadilla-silla.webp",

    "Step-up en escalón bajo":
        "/img/ejercicios/02-step-up.webp",

    "Bisagra de cadera":
        "/img/ejercicios/03-bisagra-cadera.webp",

    "Puente de glúteos":
        "/img/ejercicios/04-puente-gluteos.webp",

    "Flexiones inclinadas":
        "/img/ejercicios/05-flexiones-inclinadas.webp",

    "Remo isométrico con toalla":
        "/img/ejercicios/06-remo-toalla.webp",

    "Elevación de brazos en pared":
        "/img/ejercicios/07-elevacion-brazos-pared.webp",

    "Bird dog":
        "/img/ejercicios/08-bird-dog.webp",

    "Sentadilla goblet":
        "/img/ejercicios/09-sentadilla-goblet.webp",

    "Zancada hacia atrás":
        "/img/ejercicios/10-zancada-atras.webp",

    "Peso muerto rumano con mancuernas":
        "/img/ejercicios/11-peso-muerto-rumano.webp",

    "Puente de glúteos con carga":
        "/img/ejercicios/12-puente-gluteos-carga.webp",

    "Press de pecho con mancuernas":
        "/img/ejercicios/13-press-pecho-mancuernas.webp",

    "Remo con mancuernas":
        "/img/ejercicios/14-remo-mancuernas.webp",

    "Press de hombros con mancuernas":
        "/img/ejercicios/15-press-hombros-mancuernas.webp",

    "Dead bug":
        "/img/ejercicios/16-dead-bug.webp",

    "Sentadilla goblet o multipower":
        "/img/ejercicios/17-sentadilla-multipower.webp",

    "Prensa de piernas":
        "/img/ejercicios/18-prensa-piernas.webp",

    "Hip thrust":
        "/img/ejercicios/19-hip-thrust.webp",

    "Press de pecho en máquina":
        "/img/ejercicios/20-press-pecho-maquina.webp",

    "Remo sentado en polea":
        "/img/ejercicios/21-remo-polea.webp",

    "Press de hombros en máquina":
        "/img/ejercicios/22-press-hombros-maquina.webp",

    "Pallof press":
        "/img/ejercicios/23-pallof-press.webp",

    "Calentamiento general":
        "/img/ejercicios/24-calentamiento.webp",

    "Bicicleta, cinta o elíptica":
        "/img/ejercicios/25-cardio-maquina.webp",

    "Caminata rápida":
        "/img/ejercicios/26-caminata-rapida.webp",

    "Cardio final en máquina":
        "/img/ejercicios/27-cardio-final.webp",

    "Marcha rápida":
        "/img/ejercicios/28-marcha-rapida.webp",

    "Intervalos en bicicleta":
        "/img/ejercicios/29-intervalos-bicicleta.webp",

    "Intervalos caminando":
        "/img/ejercicios/30-intervalos-caminando.webp",

    "Movilidad global":
        "/img/ejercicios/31-movilidad-global.webp",

    "Equilibrio con apoyo":
        "/img/ejercicios/32-equilibrio-apoyo.webp",

    "Vuelta a la calma":
        "/img/ejercicios/33-vuelta-calma.webp",

    "Sentarse y levantarse de una silla":
        "/img/ejercicios/34-sentarse-levantarse.webp",

    "Puente de glúteos sin carga":
        "/img/ejercicios/35-puente-gluteos-sin-carga.webp",

    "Retracción escapular suave":
        "/img/ejercicios/36-retraccion-escapular.webp",

    "Bicicleta reclinada suave":
        "/img/ejercicios/37-bicicleta-reclinada.webp",

    "Marcha suave con apoyo":
        "/img/ejercicios/38-marcha-apoyo.webp"
};