// CSS ファイルのインポートを許可
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

// CSS モジュールのインポートを許可
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
