declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.txt' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const filePath: string;
  export default filePath;
}

declare module '*.png' {
  const filePath: string;
  export default filePath;
}

declare module '*.svg' {
  const filePath: string;
  export default filePath;
}

declare module '*.mp3' {
  const filePath: string;
  export default filePath;
}

declare module '*.obj' {
  const filePath: string;
  export default filePath;
}

declare module '*.vert' {
  const text: string;
  export default text;
}

declare module '*.frag' {
  const text: string;
  export default text;
}
