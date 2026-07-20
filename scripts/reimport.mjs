import { importSaveFile } from '../lib/importSave.ts';
const result = await importSaveFile(String.raw`C:\Users\User\Documents\EA SPORTS College Football 27\saves\DYNASTY-JUL16-04h24m23-AUTOSAVE`);
console.log(result);
process.exit(0);
