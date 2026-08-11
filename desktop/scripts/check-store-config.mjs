import { readFile } from 'node:fs/promises'

const rootPackageUrl = new URL('../../package.json', import.meta.url)
const desktopPackageUrl = new URL('../package.json', import.meta.url)
const webPackageUrl = new URL('../../web/package.json', import.meta.url)
const storeGuideUrl = new URL('../../STORE_SUBMISSION.md', import.meta.url)
const aboutModalUrl = new URL('../../web/src/components/AboutModal.vue', import.meta.url)

const [rootPackage, desktopPackage, webPackage, storeGuide, aboutModal] = await Promise.all([
  readFile(rootPackageUrl, 'utf8').then(JSON.parse),
  readFile(desktopPackageUrl, 'utf8').then(JSON.parse),
  readFile(webPackageUrl, 'utf8').then(JSON.parse),
  readFile(storeGuideUrl, 'utf8'),
  readFile(aboutModalUrl, 'utf8'),
])

const expected = {
  applicationId: 'MDToDOCX',
  displayName: 'MD to DOCX',
  identityName: 'Sajib-Civil-Engineer-BD.md-to-docx',
  minVersion: '10.0.22000.0',
  publisher: 'CN=5F94008D-1A8C-4CB5-AB4F-7470ED48FD13',
  publisherDisplayName: 'Sajib-Civil-Engineer-BD',
}

function assertEqual(label, actual, wanted) {
  if (actual !== wanted) throw new Error(`${label} is ${JSON.stringify(actual)}; expected ${JSON.stringify(wanted)}.`)
}

assertEqual('Desktop version', desktopPackage.version, rootPackage.version)
assertEqual('Web version', webPackage.version, rootPackage.version)
assertEqual('Desktop productName', desktopPackage.build.productName, expected.displayName)

for (const [key, value] of Object.entries(expected)) {
  assertEqual(`AppX ${key}`, desktopPackage.build.appx[key], value)
}

if (!desktopPackage.build.appx.languages?.includes('en-US')) {
  throw new Error('The Store package must declare en-US.')
}
if (!desktopPackage.build.appx.capabilities?.includes('runFullTrust')) {
  throw new Error('The Electron Store package must declare runFullTrust.')
}
if (desktopPackage.build.appx.addAutoLaunchExtension !== false) {
  throw new Error('The Store package must not register an auto-start extension.')
}

const versionParts = rootPackage.version.split('.')
if (versionParts.length !== 3 || versionParts.some((part) => !/^\d+$/.test(part))) {
  throw new Error(`Root version ${rootPackage.version} is not a three-part semantic version.`)
}

const storeVersion = `${rootPackage.version}.0`
for (const value of [expected.identityName, expected.publisher, expected.applicationId, storeVersion, '9PHJ30FS06QH']) {
  if (!storeGuide.includes(value)) throw new Error(`STORE_SUBMISSION.md is missing ${value}.`)
}
if (!aboutModal.includes('const appVersion = __APP_VERSION__')) {
  throw new Error('The About panel must derive its version from the root build constant.')
}
assertEqual(
  'Repository URL',
  rootPackage.repository?.url,
  'https://github.com/md-ishtiak-ahmed-sajib/md-to-docx.git',
)

console.log(`Store configuration is valid: ${expected.identityName} ${storeVersion}`)
