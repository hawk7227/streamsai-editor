import { bootstrapApi } from "./bootstrap"; bootstrapApi().listen(Number(process.env.PORT_API||4010),()=>console.log(`api listening on ${process.env.PORT_API||4010}`));
