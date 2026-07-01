.PHONY: build test test-all fmt clean bindings

# Build all Soroban contracts to Wasm.
build:
	stellar contract build

# Fast, wasm-free contract tests (Oracle, Treasury, Market, Factory basics).
# Proves Market->Oracle and Market->Treasury cross-contract calls.
test:
	cargo test --workspace

# Full suite incl. the Factory->Market cross-contract DEPLOY test, which needs
# the built market.wasm (contractimport). Always builds first.
test-all: build
	cargo test --workspace
	cargo test -p factory --features wasm-tests

fmt:
	cargo fmt --all

clean:
	cargo clean
	rm -rf node_modules apps/*/node_modules packages/*/node_modules .turbo
