declare module 'emoji-name-map' {
  const emojiNameMap: {
    get(name: string): string | undefined
  }
  export default emojiNameMap
}
