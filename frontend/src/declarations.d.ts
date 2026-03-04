declare module "@reduxjs/toolkit/query/react" {
  // Minimal ambient declarations so TypeScript can resolve the module.
  // At runtime the real implementation from @reduxjs/toolkit/query/react
  // will be used by the bundler.
  export function createApi(config: any): any;
  export function fetchBaseQuery(config: any): any;
}

