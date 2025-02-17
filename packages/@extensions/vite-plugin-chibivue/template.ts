import { ResolvedOptions } from ".";
import { SFCTemplateCompileResults } from "../../compiler-sfc/compileTemplate";

export function transformTemplateInMain(
  code: string,
  options: ResolvedOptions
): SFCTemplateCompileResults {
  const result = compile(code, options);
  return {
    ...result,
    code: result.code.replace(
      /\n(function|const) (render|ssrRender)/,
      "\n$1 _sfc_$2"
    ),
  };
}

export function compile(source: string, options: ResolvedOptions) {
  return options.compiler.compileTemplate({ source });
}
