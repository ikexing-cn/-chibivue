import { hasOwn } from "../shared";
import { ComponentInternalInstance, Data } from "./component";

export type ComponentPublicInstanceConstructor<
  T extends ComponentPublicInstance<
    Props,
    RawBindings,
    D
  > = ComponentPublicInstance<any>,
  Props = any,
  RawBindings = any,
  D = any
> = {
  new (...args: any[]): T;
};

export type ComponentPublicInstance<P = {}, B = {}, D = {}> = {
  $: ComponentInternalInstance;
} & P &
  B &
  D;

export interface ComponentRenderContext {
  [key: string]: any;
  _: ComponentInternalInstance;
}

const hasSetupBinding = (state: Data, key: string) => hasOwn(state, key);

export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
  get({ _: instance }: ComponentRenderContext, key: string) {
    const { setupState, props, data } = instance;

    let normalizedProps;
    if (hasSetupBinding(setupState, key)) {
      return setupState[key];
    } else if (
      (normalizedProps = instance.propsOptions) &&
      hasOwn(normalizedProps, key)
    ) {
      return props![key];
    } else if (hasOwn(data, key)) {
      return instance.data[key];
    }
  },
  set(
    { _: instance }: ComponentRenderContext,
    key: string,
    value: any
  ): boolean {
    const { setupState, data } = instance;
    if (hasSetupBinding(setupState, key)) {
      setupState[key] = value;
      return true;
    } else if (hasOwn(data, key)) {
      instance.data[key] = value;
      return true;
    }
    return true;
  },
};
