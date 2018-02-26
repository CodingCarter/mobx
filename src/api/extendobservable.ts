import { isObservableMap } from "../types/observablemap"
import {
    asObservableObject,
    defineObservablePropertyFromDescriptor
} from "../types/observableobject"
import { isObservable } from "./isobservable"
import { invariant, isPropertyConfigurable, hasOwnProperty } from "../utils/utils"
import { deepEnhancer, referenceEnhancer, IEnhancer } from "../types/modifiers"
import { startBatch, endBatch } from "../core/observable"

export function extendObservable<A extends Object, B extends Object>(
    target: A,
    ...properties: B[]
): A & B {
    return extendObservableHelper(target, deepEnhancer, properties) as any
}

export function extendShallowObservable<A extends Object, B extends Object>(
    target: A,
    ...properties: B[]
): A & B {
    return extendObservableHelper(target, referenceEnhancer, properties) as any
}

export function extendObservableHelper(
    target: Object,
    defaultEnhancer: IEnhancer<any>,
    properties: Object[]
): Object {
    if (process.env.NODE_ENV !== "production") {
        invariant(arguments.length >= 2, "'extendObservable' expected 2 or more arguments")
        invariant(
            typeof target === "object",
            "'extendObservable' expects an object as first argument"
        )
        invariant(
            !isObservableMap(target),
            "'extendObservable' should not be used on maps, use map.merge instead"
        )
        properties.forEach(propSet => {
            invariant(
                typeof propSet === "object",
                "All arguments of 'extendObservable' should be objects"
            )
            invariant(
                !isObservable(propSet),
                "Extending an object with another observable (object) is not supported. Please construct an explicit propertymap, using `toJS` if need. See issue #540"
            )
        })
    }

    const adm = asObservableObject(target)
    const definedProps = {}
    startBatch()
    try {
        for (let i = properties.length - 1; i >= 0; i--) {
            const propSet = properties[i]
            for (let key in propSet)
                if (definedProps[key] !== true && hasOwnProperty(propSet, key)) {
                    definedProps[key] = true
                    if ((target as any) === propSet && !isPropertyConfigurable(target, key))
                        continue // see #111, skip non-configurable or non-writable props for `observable(object)`.
                    const descriptor = Object.getOwnPropertyDescriptor(propSet, key)
                    defineObservablePropertyFromDescriptor(adm, key, descriptor!, defaultEnhancer)
                }
        }
    } finally {
        endBatch()
    }
    return target
}
