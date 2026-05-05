/**
 * Hook for programmatic map control
 */
import type { MapControls } from '../types';
/**
 * Hook that provides methods for programmatic map manipulation.
 * Must be used within a GeoMap component.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const controls = useMapControls();
 *
 *   const handleFitToData = () => {
 *     controls.fitBounds([-10, 35, 40, 70], { padding: 50 });
 *   };
 *
 *   return <button onClick={handleFitToData}>Fit to Europe</button>;
 * }
 * ```
 */
export declare function useMapControls(): MapControls;
//# sourceMappingURL=useMapControls.d.ts.map