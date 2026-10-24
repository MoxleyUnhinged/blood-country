CC      ?= cc
CFLAGS  ?= -O2 -std=c99 -Wall -Wextra -fPIC
BUILD   := build

ifeq ($(OS),Windows_NT)
  LIB := $(BUILD)/bc_engine.dll
else ifeq ($(shell uname),Darwin)
  LIB := $(BUILD)/libbc_engine.dylib
else
  LIB := $(BUILD)/libbc_engine.so
endif

.PHONY: all test clean
all: $(LIB)

$(BUILD):
	mkdir -p $(BUILD)

$(LIB): engine/bc_engine.c engine/bc_engine.h | $(BUILD)
	$(CC) $(CFLAGS) -shared -o $@ engine/bc_engine.c

test: $(BUILD)/test_engine
	./$(BUILD)/test_engine

$(BUILD)/test_engine: engine/test_engine.c engine/bc_engine.c engine/bc_engine.h | $(BUILD)
	$(CC) $(CFLAGS) -o $@ engine/test_engine.c engine/bc_engine.c

clean:
	rm -rf $(BUILD)
