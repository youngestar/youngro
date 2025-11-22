import type { SVGProps } from "react";
import { Ref, forwardRef } from "react";
const CloseIconInner = (props: SVGProps<SVGSVGElement>, ref: Ref<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width="1em" height="1em" ref={ref} {...props}>{props.title ? <title>{props.title}</title> : null}<path d="M18 6 6 18M6 6l12 12" /></svg>;
export const CloseIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(CloseIconInner);
CloseIcon.displayName = 'CloseIcon';
export default CloseIcon;
