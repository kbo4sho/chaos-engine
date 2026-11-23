export function setupAddress(route, settings) {
  return route + '/fit/' + settings.join('.');
}
export function readSetupAddress(requested) {
  const [route, code, ...rest] = requested.split('/fit/');
  if (code === undefined) return { route, settings: null };
  if (rest.length || !/^[0-9](\.[0-9])?$/.test(code)) return { route, invalid: true };
  return { route, settings: code.split('.').map(Number) };
}
export function sandboxAddress(type, route) {
  return '../../#' + new URLSearchParams({ [type]: route });
}
export function studyPage(type, route) {
  const page = type === 'study' ? '' : type === 'shutters' ? 'double.html' : null;
  return page !== null && typeof route === 'string' && /^[a-z0-9./-]{1,140}$/.test(route)
    ? 'one-part-missing/discovery/' + page + '#' + route
    : null;
}
