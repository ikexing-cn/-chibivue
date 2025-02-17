# Various Reactive Proxy Handlers

## Objects that should not be reactive

Now, let's solve a problem with the current Reactivity System.  
First, try running the following code.

```ts
import { createApp, h, ref } from "chibivue";

const app = createApp({
  setup() {
    const inputRef = ref<HTMLInputElement | null>(null);
    const getRef = () => {
      inputRef.value = document.getElementById(
        "my-input"
      ) as HTMLInputElement | null;
      console.log(inputRef.value);
    };

    return () =>
      h("div", {}, [
        h("input", { id: "my-input" }, []),
        h("button", { onClick: getRef }, ["getRef"]),
      ]);
  },
});

app.mount("#app");
```

If you check the console, you should see the following result:

![reactive_html_element](https://raw.githubusercontent.com/Ubugeeei/chibivue/main/book/images/reactive_html_element.png)

Now, let's add a focus function.

```ts
import { createApp, h, ref } from "chibivue";

const app = createApp({
  setup() {
    const inputRef = ref<HTMLInputElement | null>(null);
    const getRef = () => {
      inputRef.value = document.getElementById(
        "my-input"
      ) as HTMLInputElement | null;
      console.log(inputRef.value);
    };
    const focus = () => {
      inputRef.value?.focus();
    };

    return () =>
      h("div", {}, [
        h("input", { id: "my-input" }, []),
        h("button", { onClick: getRef }, ["getRef"]),
        h("button", { onClick: focus }, ["focus"]),
      ]);
  },
});

app.mount("#app");
```

Surprisingly, it throws an error.

![focus_in_reactive_html_element](https://raw.githubusercontent.com/Ubugeeei/chibivue/main/book/images/focus_in_reactive_html_element.png)

The reason for this is that the element obtained by `document.getElementById` is used to generate a Proxy itself.

When a Proxy is generated, the value becomes the Proxy instead of the original object, causing the loss of HTML element functionality.

## Determine the object before generating a reactive Proxy

The determination method is very simple. Use `Object.prototype.toString`.
Let's see how `Object.prototype.toString` determines an HTMLInputElement in the code above.

```ts
import { createApp, h, ref } from "chibivue";

const app = createApp({
  setup() {
    const inputRef = ref<HTMLInputElement | null>(null);
    const getRef = () => {
      inputRef.value = document.getElementById(
        "my-input"
      ) as HTMLInputElement | null;
      console.log(inputRef.value?.toString());
    };
    const focus = () => {
      inputRef.value?.focus();
    };

    return () =>
      h("div", {}, [
        h("input", { id: "my-input" }, []),
        h("button", { onClick: getRef }, ["getRef"]),
        h("button", { onClick: focus }, ["focus"]),
      ]);
  },
});

app.mount("#app");
```

![element_to_string](https://raw.githubusercontent.com/Ubugeeei/chibivue/main/book/images/element_to_string.png)

This allows us to determine the type of the object. Although it is somewhat hard-coded, let's generalize this determination function.

```ts
// shared/general.ts
export const objectToString = Object.prototype.toString; // already used in isMap and isSet
export const toTypeString = (value: unknown): string =>
  objectToString.call(value);

// Function to be added this time
export const toRawType = (value: unknown): string => {
  return toTypeString(value).slice(8, -1);
};
```

The reason for using `slice` is to obtain the string corresponding to `hoge` in `[Object hoge]`.

Then, let's determine the type of the object by using `reactive toRawType` and branch it.
Skip generating a Proxy for HTMLInput.

In reactive.ts, get the rawType and determine the type of the object that will be the target of reactive.

```ts
const enum TargetType {
  INVALID = 0,
  COMMON = 1,
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case "Object":
    case "Array":
      return TargetType.COMMON;
    default:
      return TargetType.INVALID;
  }
}

function getTargetType<T extends object>(value: T) {
  return !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value));
}
```

```ts
export function reactive<T extends object>(target: T): T {
  const targetType = getTargetType(target);
  if (targetType === TargetType.INVALID) {
    return target;
  }

  const proxy = new Proxy(target, mutableHandlers);
  return proxy as T;
}
```

Now, the focus code should work!

![focus_in_element](https://raw.githubusercontent.com/Ubugeeei/chibivue/main/book/images/focus_in_element.png)

## Implementing TemplateRefs

Now that we can put HTML elements into Ref, let's implement TemplateRef.

Ref can be used to reference a template by using the ref attribute.

https://vuejs.org/guide/essentials/template-refs.html

The goal is to make the following code work:

```ts
import { createApp, h, ref } from "chibivue";

const app = createApp({
  setup() {
    const inputRef = ref<HTMLInputElement | null>(null);
    const focus = () => {
      inputRef.value?.focus();
    };

    return () =>
      h("div", {}, [
        h("input", { ref: inputRef }, []),
        h("button", { onClick: focus }, ["focus"]),
      ]);
  },
});

app.mount("#app");
```

If you've come this far, you probably already see how to implement it.
Yes, just add ref to VNode and inject the value during rendering.

```ts
export interface VNode<HostNode = any> {
  // .
  // .
  key: string | number | symbol | null;
  ref: Ref | null; // This
  // .
  // .
}
```

In the original implementation, it is called `setRef`. Find it, read it, and implement it!
In the original implementation, it is more complicated, with ref being an array and accessible with `$ref`, but for now, let's aim for a code that works with the above code.

By the way, if it is a component, assign the component's `setupContext` to the ref.  
(Note: In reality, you should pass the component's proxy, but it is not yet implemented, so we are using `setupContext` for now.)

```ts
import { createApp, h, ref } from "chibivue";

const Child = {
  setup() {
    const action = () => alert("clicked!");
    return { action };
  },

  template: `<button @click="action">action (child)</button>`,
};

const app = createApp({
  setup() {
    const childRef = ref<any>(null);
    const childAction = () => {
      childRef.value?.action();
    };

    return () =>
      h("div", {}, [
        h("div", {}, [
          h(Child, { ref: childRef }, []),
          h("button", { onClick: childAction }, ["action (parent)"]),
        ]),
      ]);
  },
});

app.mount("#app");
```

Source code up to this point:  
[chibivue (GitHub)](https://github.com/Ubugeeei/chibivue/tree/main/book/impls/30_basic_reactivity_system/110_template_refs)

Support for Collection-based built-in objects

Currently, when looking at the implementation of reactive.ts, it only targets Object and Array.

```ts
function targetTypeMap(rawType: string) {
  switch (rawType) {
    case "Object":
    case "Array":
      return TargetType.COMMON;
    default:
      return TargetType.INVALID;
  }
}
```

In Vue.js, in addition to these, it also supports Map, Set, WeakMap, and WeakSet.

https://github.com/vuejs/core/blob/9f8e98af891f456cc8cc9019a31704e5534d1f08/packages/reactivity/src/reactive.ts#L43C1-L56C2

And these objects are implemented as separate Proxy handlers. It is called `collectionHandlers`.

Here, we will implement this `collectionHandlers` and aim for the following code to work.

```ts
const app = createApp({
  setup() {
    const state = reactive({ map: new Map(), set: new Set() });

    return () =>
      h("div", {}, [
        h("h1", {}, [`ReactiveCollection`]),

        h("p", {}, [
          `map (${state.map.size}): ${JSON.stringify([...state.map])}`,
        ]),
        h("button", { onClick: () => state.map.set(Date.now(), "item") }, [
          "update map",
        ]),

        h("p", {}, [
          `set (${state.set.size}): ${JSON.stringify([...state.set])}`,
        ]),
        h("button", { onClick: () => state.set.add("item") }, ["update set"]),
      ]);
  },
});

app.mount("#app");
```

In `collectionHandlers`, we implement handlers for methods such as add, set, and delete.  
The implementation of these can be found in `collectionHandlers.ts`.  
https://github.com/vuejs/core/blob/9f8e98af891f456cc8cc9019a31704e5534d1f08/packages/reactivity/src/collectionHandlers.ts#L0-L1  
By determining the `TargetType`, if it is a collection type, we generate a Proxy based on this handler for `h`.  
Let's actually implement it!

One thing to note is that when passing the target itself to the receiver of Reflect, it may cause an infinite loop if the target itself has a Proxy set.  
To avoid this, we change the structure to have the raw data attached to the target, and when implementing the Proxy handler, we modify it to operate on this raw data.

```ts
export const enum ReactiveFlags {
  RAW = "__v_raw",
}

export interface Target {
  [ReactiveFlags.RAW]?: any;
}
```

Strictly speaking, this implementation should have been done for the normal reactive handler as well, but it was omitted to minimize unnecessary explanations and because there were no problems so far.  
Let's try implementing it so that if the key that enters the getter is `ReactiveFlags.RAW`, it returns the raw data instead of a Proxy.

Along with this, we also implement a function called `toRaw` that recursively retrieves raw data from the target and ultimately obtains data that is in a raw state.

```ts
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}
```

By the way, this `toRaw` function is also provided as an API function.

https://vuejs.org/api/reactivity-advanced.html#toraw

Source code so far:  
[chibivue (GitHub)](https://github.com/Ubugeeei/chibivue/tree/main/book/impls/30_basic_reactivity_system/120_proxy_handler_improvement)
