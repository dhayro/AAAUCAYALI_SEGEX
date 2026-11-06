// Destinos de los documentos SISGED. Pueden venir entre corchetes ("[ANA-AAA.U] SANTOS ...") o sin ellos
// ("MIGUEL ... - ADMINISTRACION LOCAL DE AGUA TARMA"), así que se busca la palabra clave en todo el texto.
// Solo se muestran a quien no es admin los documentos con alguno de estos destinos.
const DESTINOS_PERMITIDOS = [
  'ANA-AAA.U',
  'ANA-AAA.U-ALA.PU',
  'ANA-AAA.U-ALA.AT', // Atalaya, como aparece en SISGED
  'ANA-AAA.U-ALA.PE',
  'ANA-AAA.U-ALA.TAR',
  'AUTORIDAD ADMINISTRATIVA DEL AGUA - UCAYALI',
  'ADMINISTRACION LOCAL DE AGUA PUCALLPA',
  'ADMINISTRACION LOCAL DE AGUA ATALAYA',
  'ADMINISTRACION LOCAL DE AGUA TARMA',
  'ADMINISTRACION LOCAL DE AGUA PERENE',
];

const normalizarTexto = (texto) =>
  String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Cada palabra clave debe aparecer completa: "ANA-AAA.U" no debe coincidir con "ANA-AAA.UV".
const PATRONES = DESTINOS_PERMITIDOS.map((clave) => ({
  clave,
  regex: new RegExp(`(?<![A-Z0-9])${escaparRegex(normalizarTexto(clave))}(?![A-Z0-9])`),
}));

// Destinos permitidos que aparecen en el texto, con o sin corchetes.
const codigosPermitidosEn = (texto) => {
  const normalizado = normalizarTexto(texto);
  return PATRONES.filter((p) => p.regex.test(normalizado)).map((p) => p.clave);
};

// Códigos de destino del texto: los que van entre corchetes y los destinos permitidos encontrados.
const extraerCodigosDestino = (texto) => {
  const entreCorchetes = [...String(texto || '').matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].trim()).filter(Boolean);
  return [...new Set([...entreCorchetes, ...codigosPermitidosEn(texto)])];
};

const esDestinoPermitido = (texto) => codigosPermitidosEn(texto).length > 0;

const esAdmin = (usuario) => usuario?.perfil === 'admin';

module.exports = { DESTINOS_PERMITIDOS, extraerCodigosDestino, esDestinoPermitido, esAdmin };
