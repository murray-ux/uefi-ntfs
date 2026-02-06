# Third-Party Licenses

CAPUT Sovereign Security Platform
Copyright 2025 murray-ux
SPDX-License-Identifier: Apache-2.0

---

## Overview

This document lists all third-party components used in the CAPUT Sovereign Security Platform and their respective licenses. All components are used in compliance with their license terms.

---

## License Summary Table

| Component | Version | License | SPDX-ID | Source |
|-----------|---------|---------|---------|--------|
| Node.js | 20.x+ | MIT | MIT | https://nodejs.org |
| Express.js | 4.x | MIT | MIT | https://expressjs.com |
| PostgreSQL | 15+ | PostgreSQL | PostgreSQL | https://postgresql.org |
| Redis | 7.x | BSD-3-Clause | BSD-3-Clause | https://redis.io |
| Docker | 24+ | Apache-2.0 | Apache-2.0 | https://docker.com |
| NumPy | 1.26+ | BSD-3-Clause | BSD-3-Clause | https://numpy.org |
| SciPy | 1.11+ | BSD-3-Clause | BSD-3-Clause | https://scipy.org |
| Trimesh | 3.20+ | MIT | MIT | https://trimsh.org |
| Panda3D | 1.10+ | BSD-3-Clause | BSD-3-Clause | https://panda3d.org |
| PyYAML | 6.0+ | MIT | MIT | https://pyyaml.org |
| TypeScript | 5.3+ | Apache-2.0 | Apache-2.0 | https://typescriptlang.org |
| sha2 (Rust) | 0.10 | MIT/Apache-2.0 | MIT | https://crates.io/crates/sha2 |
| hex (Rust) | 0.4 | MIT/Apache-2.0 | MIT | https://crates.io/crates/hex |
| ed25519-dalek | 2.x | BSD-3-Clause | BSD-3-Clause | https://crates.io/crates/ed25519-dalek |
| serde (Rust) | 1.x | MIT/Apache-2.0 | MIT | https://crates.io/crates/serde |
| serde_json | 1.x | MIT/Apache-2.0 | MIT | https://crates.io/crates/serde_json |

---

## Full License Texts

### MIT License

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### BSD 3-Clause License

```
BSD 3-Clause License

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### PostgreSQL License

```
PostgreSQL License

Permission to use, copy, modify, and distribute this software and its
documentation for any purpose, without fee, and without a written agreement
is hereby granted, provided that the above copyright notice and this
paragraph and the following two paragraphs appear in all copies.

IN NO EVENT SHALL THE COPYRIGHT HOLDERS BE LIABLE TO ANY PARTY FOR DIRECT,
INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST
PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION,
EVEN IF THE COPYRIGHT HOLDERS HAVE BEEN ADVISED OF THE POSSIBILITY OF
SUCH DAMAGE.

THE COPYRIGHT HOLDERS SPECIFICALLY DISCLAIM ANY WARRANTIES, INCLUDING,
BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
FOR A PARTICULAR PURPOSE. THE SOFTWARE PROVIDED HEREUNDER IS ON AN "AS IS"
BASIS, AND THE COPYRIGHT HOLDERS HAVE NO OBLIGATIONS TO PROVIDE MAINTENANCE,
SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
```

### Apache License 2.0

See the main [LICENSE](../LICENSE) file for the complete Apache License 2.0 text.

---

## Component Details

### Node.js

**License:** MIT
**Copyright:** Copyright Node.js Contributors
**Usage:** Runtime environment for server-side JavaScript
**Source:** https://nodejs.org

### Express.js

**License:** MIT
**Copyright:** Copyright (c) 2009-2014 TJ Holowaychuk, Copyright (c) 2013-2014 Roman Shtylman, Copyright (c) 2014-2015 Douglas Christopher Wilson
**Usage:** Web application framework
**Source:** https://expressjs.com

### PostgreSQL

**License:** PostgreSQL License
**Copyright:** Copyright (c) 1996-2025, The PostgreSQL Global Development Group
**Usage:** Relational database management system
**Source:** https://postgresql.org

### Redis

**License:** BSD 3-Clause
**Copyright:** Copyright (c) 2006-2025, Salvatore Sanfilippo
**Usage:** In-memory data store for caching and pub/sub
**Source:** https://redis.io

### Docker

**License:** Apache License 2.0
**Copyright:** Copyright 2013-2025 Docker, Inc.
**Usage:** Container runtime and orchestration
**Source:** https://docker.com

### NumPy

**License:** BSD 3-Clause
**Copyright:** Copyright (c) 2005-2025, NumPy Developers
**Usage:** Numerical computing library
**Source:** https://numpy.org

### TypeScript

**License:** Apache License 2.0
**Copyright:** Copyright (c) Microsoft Corporation
**Usage:** Typed JavaScript compilation
**Source:** https://typescriptlang.org

---

## Compliance Notes

1. **Attribution:** All third-party components are properly attributed in this document
2. **License Compatibility:** All listed licenses are compatible with Apache License 2.0
3. **Distribution:** Required license notices are preserved in source and binary distributions
4. **Modifications:** Any modifications to third-party code are documented

---

## Adding New Dependencies

When adding new third-party dependencies:

1. Verify license compatibility with Apache 2.0
2. Add entry to the summary table above
3. Include full license text if not already present
4. Add component details section
5. Update NOTICE file if required

---

*Last Updated: 2025-02-04*
*Maintained by: murray-ux*
