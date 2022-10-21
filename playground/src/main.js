import { VERSION as RUNTIME_VERSION } from '@intrnl/velvet';
import { VERSION as COMPILER_VERSION } from '@intrnl/velvet-compiler';

const runtimeVersion = document.getElementById('runtime-version');
const compilerVersion = document.getElementById('compiler-version');
const commitHash = document.getElementById('commit-hash');

runtimeVersion.textContent = RUNTIME_VERSION;
compilerVersion.textContent = COMPILER_VERSION;
commitHash.textContent = COMMIT_HASH;
