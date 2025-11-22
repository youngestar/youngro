import type { SVGProps } from "react";
import { Ref, forwardRef } from "react";
const SearchIconInner = (props: SVGProps<SVGSVGElement>, ref: Ref<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width="1em" height="1em" ref={ref} {...props}>{props.title ? <title>{props.title}</title> : null}<circle cx={11} cy={11} r={6} /><path d="m21 21-4.35-4.35" /></svg>;
export const SearchIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(SearchIconInner);
SearchIcon.displayName = 'SearchIcon';
export default SearchIcon;
