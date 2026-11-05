// Referencias DOM del inicio tipo perfil (declarado en index.html).
export const inicioPerfil = document.getElementById('inicio-perfil');
export const capaFondo = document.getElementById('inicio-fondo');
export const videoFondo = document.getElementById('inicio-video');
export const mitadPerfil = document.getElementById('inicio-mitad-perfil');
export const mitadBotones = document.getElementById('inicio-mitad-botones');
export const panalPerfil = mitadPerfil.querySelector('.inicio-panal');
export const hexPerfil = mitadPerfil.querySelector('.inicio-hex-perfil');
export const nombrePerfil = mitadPerfil.querySelector('.inicio-nombre');
export const botonPlay = document.getElementById('inicio-play');
export const botonesSatelite = [...mitadBotones.querySelectorAll('.inicio-hex-satelite')];
export const botonMenu = document.getElementById('inicio-menu');
export const botonAjustes = document.getElementById('inicio-ajustes');
export const panelAjustes = document.getElementById('inicio-panel-ajustes');
export const opcionesFondo = document.getElementById('inicio-fondo-opciones');
