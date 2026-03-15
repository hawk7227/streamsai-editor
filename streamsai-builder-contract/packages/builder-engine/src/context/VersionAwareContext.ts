export function buildVersionAwareContext(pkgJson:any){ return {dependencies:pkgJson?.dependencies??{},devDependencies:pkgJson?.devDependencies??{}}; }
