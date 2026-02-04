/**
 * jscodeshift transform: reemplaza el archivo de entrada por el contenido
 * de un archivo "desired" (para que sea byte-to-byte idéntico).
 *
 * Uso recomendado:
 *   npx jscodeshift -t transform-objdump64.js ./binaries/objdump64.js --parser=babel --desired=/ruta/al/objdump64.js
 *
 * Alternativa (si quieres hardcodear la ruta del deseado):
 *   edita DEFAULT_DESIRED_PATH más abajo.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_DESIRED_PATH =
  "/home/juancarlos/Escritorio/creator-beta/src/core/assembler/sailAssembler/web/wasm/objdump64.js";

module.exports = function transformer(file, api, options) {
  // Permite pasar --desired=... o --deseado=...
  const desiredArg = options && (options.desired || options.deseado);
  const desiredPath = desiredArg
    ? path.resolve(process.cwd(), desiredArg)
    : DEFAULT_DESIRED_PATH;

  if (!fs.existsSync(desiredPath)) {
    throw new Error(
      `No encuentro el fichero desired:\n  ${desiredPath}\n\n` +
        `Soluciones:\n` +
        `  1) Pasa la ruta explícita:\n` +
        `     --desired=/ruta/al/objdump64.js\n` +
        `  2) O edita DEFAULT_DESIRED_PATH en el transform.\n`
    );
  }

  // Lee el deseado TAL CUAL (manteniendo saltos de línea y formato)
  const desired = fs.readFileSync(desiredPath, "utf8");

  // Devuelve exactamente ese contenido como salida transformada
  return desired;
};
