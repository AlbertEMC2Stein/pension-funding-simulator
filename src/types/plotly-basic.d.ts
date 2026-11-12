declare module "plotly.js-basic-dist-min" {
  const Plotly: {
    react: (
      element: HTMLElement,
      data: object[],
      layout: object,
      config: object,
    ) => Promise<unknown>;
    purge: (element: HTMLElement) => void;
    downloadImage: (
      element: HTMLElement,
      options: { format: "png" | "svg"; filename: string },
    ) => Promise<unknown>;
    Plots: { resize: (element: HTMLElement) => Promise<unknown> };
  };
  export default Plotly;
}
