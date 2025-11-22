import type { SVGProps } from "react";
import { Ref, forwardRef } from "react";
const MenuIconInner = (props: SVGProps<SVGSVGElement>, ref: Ref<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width="1em" height="1em" ref={ref} {...props}>{props.title ? <title>{props.title}</title> : null}<path d="M3 12h18M3 6h18M3 18h18" /></svg>;
export const MenuIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(MenuIconInner);
MenuIcon.displayName = 'MenuIcon';
export default MenuIcon;
