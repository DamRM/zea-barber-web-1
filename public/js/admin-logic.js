const firebaseConfig = {
  apiKey: "AIzaSyDGJyvvFffon_e50oTPi1l2WII4YhBerR0",
  authDomain: "zea-barber.firebaseapp.com",
  projectId: "zea-barber",
  storageBucket: "zea-barber.firebasestorage.app",
  messagingSenderId: "401527849412",
  appId: "1:401527849412:web:602e3b9d80a33c11f2a491",
  measurementId: "G-BD4T4WY9X4"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let vistaActual = 'dia';

async function validarAcceso() {
    const passIngresada = document.getElementById('admin-pass').value;
    const loginError = document.getElementById('login-error');

    try {
        const doc = await db.collection("config").doc("admin").get();
        
        if (doc.exists && doc.data().pass === passIngresada) {
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            const hoy = new Date().toLocaleDateString('en-CA', {timeZone: 'America/Lima'});
            document.getElementById('filtro-admin').value = hoy;
            verCitas();
        } else {
            loginError.style.display = 'block';
            loginError.innerText = "Clave incorrecta";
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error al conectar con el servidor.");
    }
}

async function verCitas() {
    const contenedor = document.getElementById('lista-citas');
    const fechaFiltro = document.getElementById('filtro-admin').value;
    if (!fechaFiltro) return;

    contenedor.innerHTML = "<p style='text-align:center;'>Cargando agenda...</p>";

    try {
        const docBloqueo = await db.collection("dias_bloqueados").doc(fechaFiltro).get();
        const estaBloqueado = docBloqueo.exists;

        let panelBloqueoHtml = `
            <div class="bloqueo-dia-container" style="background: var(--card); border: 1.5px solid ${estaBloqueado ? 'var(--error)' : 'var(--border-color)'}; border-radius: 16px; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                <div>
                    <strong style="color: var(--text-main); font-size: 13px; display: block; margin-bottom: 2px;">
                        <i class="fas fa-calendar-alt"></i> Estado del Día (${fechaFiltro.split('-').reverse().join('/')})
                    </strong>
                    <span style="font-size: 11px; color: ${estaBloqueado ? 'var(--error)' : 'var(--success);'}; font-weight: 600;">
                        ${estaBloqueado ? '🔴 Día Bloqueado (Sin reservas)' : '🟢 Día Habilitado'}
                    </span>
                </div>
                <button onclick="toggleBloquearDia('${fechaFiltro}', ${estaBloqueado})" style="background: ${estaBloqueado ? 'var(--success)' : 'var(--error)'}; color: white; border: none; padding: 8px 14px; border-radius: 10px; font-weight: 700; font-size: 11px; cursor: pointer; text-transform: uppercase; transition: 0.2s;">
                    ${estaBloqueado ? 'Desbloquear Día' : 'Bloquear Día'}
                </button>
            </div>
        `;

        let ref = db.collection("citas");
        let inicio, fin;

        if (vistaActual === 'dia') {
            inicio = fechaFiltro;
            fin = fechaFiltro;
        } else if (vistaActual === 'semana') {
            let d = new Date(fechaFiltro + 'T00:00:00');
            let day = d.getDay();
            let diff = d.getDate() - day + (day === 0 ? -6 : 1);
            let lunes = new Date(d.setDate(diff));
            let domingo = new Date(d.setDate(diff + 6));
            inicio = lunes.toLocaleDateString('en-CA');
            fin = domingo.toLocaleDateString('en-CA');
        } else {
            let partes = fechaFiltro.split('-');
            inicio = `${partes[0]}-${partes[1]}-01`;
            fin = `${partes[0]}-${partes[1]}-31`;
        }

        const snapshot = await ref.where("fecha", ">=", inicio).where("fecha", "<=", fin).get();
        
        let citas = [];
        snapshot.forEach(doc => citas.push({ id: doc.id, ...doc.data() }));
        
        citas.sort((a, b) => {
            if (a.fecha !== b.fecha) {
                return a.fecha.localeCompare(b.fecha);
            }
            const convertirMinutos = (horaStr) => {
                if (!horaStr) return 0;
                let [hora, periodo] = horaStr.split(' ');
                let [h, m] = hora.split(':');
                h = parseInt(h);
                if (periodo === 'PM' && h !== 12) h += 12;
                if (periodo === 'AM' && h === 12) h = 0;
                return (h * 60) + parseInt(m);
            };
            return convertirMinutos(a.hora) - convertirMinutos(b.hora);
        });

        let html = panelBloqueoHtml;
        let tC = 0; 
        let tG = 0;

        if (vistaActual === 'mes') {
            const participantesSorteo = citas.filter(c => c.posicionCiclo === 20);

            html += `
                <div class="sorteo-container-vista">
                    <h3 class="sorteo-title-vista">
                        <i class="fas fa-award"></i> Participantes del Sorteo (Corte #20) este Mes
                    </h3>
            `;

            if (participantesSorteo.length === 0) {
                html += `<p class="sorteo-empty-vista">Ningún cliente ha alcanzado el corte #20 todavía en este mes.</p>`;
            } else {
                html += `<div class="sorteo-list-vista">`;
                participantesSorteo.forEach(p => {
                    const wspSorteo = encodeURIComponent(`¡Hola ${p.cliente}! 💈 Te escribimos de Zea Barber para confirmarte que ya estás oficialmente inscrito en el sorteo exclusivo de este mes por haber alcanzado tu corte #20. ¡Mucho éxito! 🎉`);
                    html += `
                        <div class="sorteo-item-vista">
                            <div>
                                <strong class="sorteo-name-vista">${p.cliente}</strong><br>
                                <span class="sorteo-info-vista"><i class="fas fa-phone"></i> ${p.whatsapp} — Fecha: ${p.fecha.split('-').reverse().join('/')}</span>
                            </div>
                            <a href="https://wa.me/51${p.whatsapp}?text=${wspSorteo}" target="_blank" class="btn-sorteo-action-vista">
                                <i class="fab fa-whatsapp"></i> Contactar
                            </a>
                        </div>
                    `;
                });
                html += `</div>`;
            }
            html += `</div><hr class="sorteo-divider-vista">`;
        }

        // 💡 SECCIÓN DE CLIENTES INACTIVOS (> 1 MES Y MEDIO / 45 DÍAS)
        if (vistaActual === 'mes') {
            const snapshotTodas = await db.collection("citas").get();
            let mapaClientes = {};
            
            snapshotTodas.forEach(doc => {
                const c = doc.data();
                if (!c.whatsapp || !c.cliente) return;
                const w = c.whatsapp.trim();
                
                if (!mapaClientes[w]) {
                    mapaClientes[w] = { nombre: c.cliente, whatsapp: w, ultimaFecha: c.fecha };
                } else {
                    if (c.fecha > mapaClientes[w].ultimaFecha) {
                        mapaClientes[w].ultimaFecha = c.fecha;
                        mapaClientes[w].nombre = c.cliente; 
                    }
                }
            });

            const hoyObj = new Date();
            const limiteDias = 45; // 1 mes y medio
            let inactivos = [];

            Object.values(mapaClientes).forEach(cli => {
                let [anio, mes, dia] = cli.ultimaFecha.split('-').map(Number);
                let fechaUltima = new Date(anio, mes - 1, dia);
                let diferenciaDias = Math.floor((hoyObj - fechaUltima) / (1000 * 60 * 60 * 24));

                if (diferenciaDias > limiteDias) {
                    inactivos.push({ ...cli, diasSinVenir: diferenciaDias });
                }
            });

            html += `
                <div class="sorteo-container-vista" style="margin-top: 20px; border-color: #d97706;">
                    <h3 class="sorteo-title-vista" style="color: #b45309;">
                        <i class="fas fa-user-clock"></i> Clientes Inactivos (> 1 mes y medio sin venir)
                    </h3>
            `;

            if (inactivos.length === 0) {
                html += `<p class="sorteo-empty-vista">¡Excelente! No hay clientes inactivos por más de 45 días.</p>`;
            } else {
                html += `<div class="sorteo-list-vista">`;
                inactivos.forEach(cli => {
                    let msgInactivo = encodeURIComponent(`¡Hola ${cli.nombre}! 💈 Te escribimos de Zea Barber Studio. Notamos que ya ha pasado un tiempo desde tu último corte y queríamos saludarte. ¿Te gustaría agendar una cita esta semana para mantener tu estilo impecable? ¡Te esperamos! ✨`);
                    html += `
                        <div class="sorteo-item-vista">
                            <div>
                                <strong class="sorteo-name-vista">${cli.nombre}</strong><br>
                                <span class="sorteo-info-vista"><i class="fas fa-phone"></i> ${cli.whatsapp} — Última visita: ${cli.ultimaFecha.split('-').reverse().join('/')} (${cli.diasSinVenir} días atrás)</span>
                            </div>
                            <a href="https://wa.me/51${cli.whatsapp}?text=${msgInactivo}" target="_blank" class="btn-sorteo-action-vista" style="background: #25d366; color: white;">
                                <i class="fab fa-whatsapp"></i> Recordar
                            </a>
                        </div>
                    `;
                });
                html += `</div>`;
            }
            html += `</div><hr class="sorteo-divider-vista">`;
        }

        if (citas.length === 0) {
            contenedor.innerHTML = html + "<p style='text-align:center; color:#888;'>No hay citas para este periodo.</p>";
            document.getElementById('total-cortes').innerText = "0";
            document.getElementById('total-ganancia').innerText = "S/ 0.00";
            return;
        }

        citas.forEach(c => {
            const esAtendido = c.estado === 'ATENDIDO';
            const precioRealEfectivo = c.precioCobrado !== undefined ? parseFloat(c.precioCobrado) : parseFloat(c.precio || 0);

            if (esAtendido) { 
                tC++; 
                tG += precioRealEfectivo; 
            }

            let mostrarPos = c.posicionCiclo;
            while (mostrarPos > 20) {
                mostrarPos -= 20;
            }

            const etiqueta = mostrarPos === 20 ? "⭐ CORTE #20 (SORTEO)" : (mostrarPos % 5 === 0 ? "¡PREMIO!" : `Corte #${mostrarPos}`);
            
            const mensajeAviso = encodeURIComponent(`¡Hola ${c.cliente}! 💈 Te saludamos de Zea Barber. Te recordamos tu cita de hoy a las ${c.hora}. Por favor, trata de estar unos minutos antes. ¡Te esperamos!`);
            const urlWsp = `https://wa.me/51${c.whatsapp}?text=${mensajeAviso}`;

            html += `
            <div class="appointment-card ${esAtendido ? 'atendido' : ''}" style="position: relative;">
                <div onclick="liberarCita('${c.id}', '${c.hora}')" 
                     style="position: absolute; top: 12px; right: 12px; color: #ff4444; cursor: pointer; font-size: 18px; z-index: 100; line-height: 1;">
                    <i class="fas fa-times-circle"></i>
                </div>

                <div class="appointment-info">
                    <div class="time-badge">
                        <div>
                            <span>${c.hora}</span>
                            <small>${c.fecha.split('-').reverse().join('/')}</small>
                        </div>
                        <a href="${urlWsp}" target="_blank" class="wsp-icon-admin" title="Avisar al cliente">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                    </div>
                    <div class="client-name">${c.cliente}</div>
                    <div class="service-details">
                        <strong style="color: var(--primary);">BARBERO: ${c.barbero || 'ZEA'}</strong><br>
                        ${c.servicio} • S/ ${precioRealEfectivo} ${c.precioCobrado !== undefined && c.precioCobrado < c.precio ? `<span style="text-decoration: line-through; color: #666; font-size: 11px; margin-left: 5px;">S/ ${c.precio}</span>` : ''}
                    </div>
                    <div class="promo-tag ${mostrarPos === 20 ? 'tag-promo' : (mostrarPos % 5 === 0 ? 'tag-promo' : 'tag-normal')}">
                        ${etiqueta}
                    </div>
                </div>
                <button onclick="marcarAtendido('${c.id}', '${c.estado}', '${c.cliente}', '${c.whatsapp}')" class="btn-status ${esAtendido ? 'btn-done' : 'btn-pending'}">
                    ${esAtendido ? 'ATENDIDO' : 'ATENDER'}
                </button>
            </div>
        `;
        });

        contenedor.innerHTML = html;
        document.getElementById('total-cortes').innerText = tC;
        document.getElementById('total-ganancia').innerText = `S/ ${tG.toFixed(2)}`;

    } catch (e) { 
        console.error(e); 
        contenedor.innerHTML = "<p style='color:red; text-align:center;'>Error de conexión.</p>";
    }
}

async function toggleBloquearDia(fecha, estaBloqueado) {
    try {
        const ref = db.collection("dias_bloqueados").doc(fecha);
        if (estaBloqueado) {
            await ref.delete();
            alert(`El día ${fecha.split('-').reverse().join('/')} ha sido habilitado nuevamente.`);
        } else {
            await ref.set({ bloqueado: true, fecha: fecha, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            alert(`El día ${fecha.split('-').reverse().join('/')} ha sido bloqueado exitosamente. No se permitirán reservas.`);
        }
        verCitas();
    } catch (error) {
        console.error("Error al actualizar estado del día:", error);
        alert("Hubo un error al modificar el estado del día.");
    }
}

async function marcarAtendido(id, est, cliente, whatsapp) {
    if (est === 'ATENDIDO') return;
    
    if (confirm("¿Marcar este servicio como completado?")) {
        // 1. Crear el mensaje de agradecimiento inmediatamente
        const mensajeFelicitacion = encodeURIComponent(
            `¡Hola ${cliente}! 💈 De parte de todo el equipo de Zea Barber, queremos agradecerte por visitarnos hoy. 
            ¡Esperamos que hayas disfrutado tu corte y te sientas renovado! Nos vemos en la próxima. ¡Un abrazo! ✨`
        );
        
        // 2. Abrir WhatsApp AL INSTANTE (Acción síncrona directa del toque para que iOS no la bloquee)
        window.open(`https://wa.me/51${whatsapp}?text=${mensajeFelicitacion}`, '_blank');

        try {
            // 3. Actualizar la base de datos en segundo plano
            const docRef = db.collection("citas").doc(id);
            await docRef.update({ estado: 'ATENDIDO' });
            verCitas();
        } catch (e) { 
            console.error(e);
            alert("Error al actualizar en la base de datos"); 
        }
    }
}

function cambiarTab(tipo) {
    vistaActual = tipo;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tipo}`).classList.add('active');
    verCitas();
}

async function liberarCita(id, hora) {
    if (confirm(`¿Eliminar cita de las ${hora}? El horario quedará libre.`)) {
        try {
            await db.collection("citas").doc(id).delete();
            verCitas(); 
        } catch (e) {
            alert("Error al liberar");
        }
    }
}

window.onload = function() {
    const filtro = document.getElementById('filtro-admin');
    if (filtro) {
        const hoy = new Date().toLocaleDateString('en-CA', {timeZone: 'America/Lima'});
        filtro.value = hoy;
        if (document.getElementById('admin-panel').style.display === 'block') {
            verCitas();
        }
    }
};