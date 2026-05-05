/**
 * Popup — A floating card component anchored to map coordinates.
 *
 * Displays custom content at a specific location on the map.
 * Automatically repositions when the map moves.
 *
 * @example Basic usage
 * ```tsx
 * <GeoMap>
 *   <Popup
 *     coordinates={[37.6173, 55.7558]}
 *     onClose={() => setIsOpen(false)}
 *   >
 *     <h3>Moscow</h3>
 *     <p>Capital of Russia</p>
 *   </Popup>
 * </GeoMap>
 * ```
 *
 * @example With feature data
 * ```tsx
 * {selectedFeature && (
 *   <Popup
 *     coordinates={clickCoordinates}
 *     onClose={() => setSelectedFeature(null)}
 *   >
 *     <FeatureCard feature={selectedFeature} />
 *   </Popup>
 * )}
 * ```
 */
import { type ReactNode } from 'react';
import type { PopupProps } from '../../types';
export declare function Popup({ coordinates, children, onClose, className, anchor, offset, closeButton, closeOnClick, closeOnMapClick, maxWidth, }: PopupProps): ReactNode;
//# sourceMappingURL=Popup.d.ts.map