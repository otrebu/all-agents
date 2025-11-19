# TypeScript Go Implementation: Current Status & Usage

**Date:** 2025-11-19
**Objective:** TypeScript Go implementation and current usage availability

## Summary

Microsoft is porting the TypeScript compiler from JavaScript/TypeScript to Go, promising **10x performance improvements** and **50% memory reduction**. A **preview is available today** via npm (`@typescript/native-preview`) and VS Code extension, but full feature parity is expected by end of 2025. The Go implementation can handle command-line typechecking and basic language service features, making it usable for testing and development workflows now.

## Findings

### Current Availability

- **Preview Package**: Available on npm as `@typescript/native-preview`
  - Install: `npm install @typescript/native-preview`
  - Use: `npx tsgo` (replaces `tsc`)
- **VS Code Extension**: Preview available on VS Code marketplace
  - Enable via setting: `"typescript.experimental.useTsgo": true`
- **GitHub Repo**: `microsoft/typescript-go` - open source, Apache 2.0 license
- **Status**: Work in progress, not yet at full feature parity

### Implementation Status

- **Done**: Program creation, parsing/scanning, commandline/tsconfig.json parsing, build mode/project references, incremental build
- **In Progress**: Language service (LSP) - some functionality works (errors, hover, go to def, refs, sig help)
- **Not Ready**: Full API support, some CLI flags (--help, --init)

### Performance Claims

- **10x faster** build times
- **50% memory reduction** (roughly half of current implementation)
- Faster editor startup and language service operations
- Better CPU cache utilization due to lower memory usage

### Why Go Was Chosen

- **Similar code structure**: Go's syntax/style aligns with existing TS compiler codebase (functional with data structures vs class-based OOP)
- **Garbage collection**: TS compiler heavily relies on GC; Go provides automatic memory management
- **Concurrency**: Go's goroutines/channels align well with compiler architecture for parallel file processing
- **Easier porting**: More straightforward to port existing codebase vs complete rewrite (Rust would require significant re-architecting)
- **Developer accessibility**: Easier learning curve than Rust, enabling broader contributions

### Timeline & Roadmap

- **Mid-2025**: Preview `tsc` capable of command-line typechecking
- **End of 2025**: Feature-complete solution for project builds and language service
- **TypeScript 5.9**: Coming soon (still uses JS-based compiler)
- **TypeScript 7.0**: Expected to include Go-based compiler

### Compatibility & Ecosystem

- **Both compilers supported**: Microsoft confirmed both JS-based and Go-based compilers will coexist initially
- **Tooling concerns**: Some tools relying on internal compiler APIs may need adjustments
- **Bundlers**: Webpack, Vite, esbuild compatibility expected but may require updates
- **Framework support**: Angular 18/19 continue with current compiler; Angular 20+ may embrace Go version

## Analysis

The TypeScript Go implementation is **usable today** for development and testing, but with limitations. The preview supports core compilation and typechecking workflows, making it viable for:

- Command-line builds and typechecking
- Basic editor features (errors, hover, navigation)
- Testing performance improvements

However, production use should wait until full feature parity is achieved (end of 2025). The choice of Go over Rust reflects pragmatic engineering decisions focused on porting efficiency and developer accessibility rather than maximum performance potential. The 10x improvement claim stems from better threading models (goroutines vs event loop) and native compilation rather than just language speed differences.

## Sources

- **[Microsoft Developer Blogs] A 10x Faster TypeScript**: https://devblogs.microsoft.com/typescript/typescript-native-port/
- **[GitHub] microsoft/typescript-go**: https://github.com/microsoft/typescript-go
- **[Architecture Weekly] TypeScript Migrates to Go: What's Really Behind That 10x Performance Claim?**: https://www.architecture-weekly.com/p/typescript-migrates-to-go-whats-really-behind
- **[Microsoft Developer Blogs] Announcing TypeScript Native Previews**: https://devblogs.microsoft.com/typescript/announcing-typescript-native-previews/
- **[2ality] A closer look at the details behind the Go port**: https://2ality.com/2025/03/typescript-in-go.html
- **[GitHub Discussion] Why Go?**: https://github.com/microsoft/typescript-go/discussions/411
- **[Medium] TypeScript Goes Native: A 10x Performance Leap**: https://medium.com/@andipyk/typescript-goes-native-17236e084753
- **[Appwrite] TypeScript 7.0 will be 10x faster with Go**: https://appwrite.io/blog/post/typescript-7-faster-with-go
- **[Reddit] TypeScript compiler is being ported to Go**: https://www.reddit.com/r/ProgrammingLanguages/comments/1j9osva/typescript_compiler_is_being_ported_to_go/
- **[Reddit] Microsoft Rewriting TypeScript in Go**: https://www.reddit.com/r/golang/comments/1j8shzb/microsoft_rewriting_typescript_in_go/
