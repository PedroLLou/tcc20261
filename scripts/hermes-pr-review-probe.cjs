'use strict';

/**
 * Retorna uma pagina de resultados, com paginas numeradas a partir de 1.
 * Entradas invalidas geram RangeError.
 */
function paginateResults(items, page, pageSize) {
  if (!Number.isInteger(page) || page < 1 ||
      !Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('Pagina e tamanho precisam ser inteiros positivos');
  }
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

module.exports = { paginateResults };
