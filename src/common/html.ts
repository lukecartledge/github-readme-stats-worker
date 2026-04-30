/**
 * Encode string as HTML.
 *
 * @see https://stackoverflow.com/a/48073476/10629172
 */
const encodeHTML = (str: string): string => {
  return str
    .replace(/[\u00A0-\u9999<>&](?!#)/gim, (i) => {
      return '&#' + i.charCodeAt(0) + ';'
    })
    .replace(/\u0008/gim, '')
}

export { encodeHTML }
