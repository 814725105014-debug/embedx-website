// Gate the static not-found page as well as routed site pages.
import { requireCollegeAccess } from "./access-gate.js?v=20261110-domain-access";
await requireCollegeAccess();
