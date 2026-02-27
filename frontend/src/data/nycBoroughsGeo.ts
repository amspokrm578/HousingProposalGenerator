/** Simplified GeoJSON for NYC 5 boroughs - for hero visualization */
export const NYC_BOROUGHS_SIMPLE = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Manhattan", code: "MN", score: 92 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-74.05, 40.7],
            [-73.95, 40.7],
            [-73.95, 40.88],
            [-74.05, 40.88],
            [-74.05, 40.7],
          ],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Brooklyn", code: "BK", score: 85 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-74.05, 40.57],
            [-73.7, 40.57],
            [-73.7, 40.75],
            [-74.05, 40.75],
            [-74.05, 40.57],
          ],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Queens", code: "QN", score: 78 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-73.95, 40.54],
            [-73.7, 40.54],
            [-73.7, 40.8],
            [-73.95, 40.8],
            [-73.95, 40.54],
          ],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Bronx", code: "BX", score: 72 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-73.93, 40.79],
            [-73.77, 40.79],
            [-73.77, 40.92],
            [-73.93, 40.92],
            [-73.93, 40.79],
          ],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Staten Island", code: "SI", score: 68 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-74.25, 40.49],
            [-74.05, 40.49],
            [-74.05, 40.65],
            [-74.25, 40.65],
            [-74.25, 40.49],
          ],
        ],
      },
    },
  ],
};
