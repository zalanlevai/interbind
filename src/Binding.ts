import "reflect-metadata";

// TODO: Add support for BindingService.unbind() method.
// TODO: Resolve from attempt at stacking bindings.
// TODO: Add support for a @DebugBinding decorator.
// TODO: @BindType type assertion decorator.

let HAS_WARNED_ABOUT_MISSING_TYPE_ANNOTATIONS: boolean = false;
const MISSING_TYPE_ANNOTATIONS_MESSAGE: string =
    `Type annotations seem to be missing. Consider using the TypeScript compiler option --emitDecoratorMetadata for automatic type checking or specifying the types manually using the @BindableAs and @BindAs decorators."`;
let HAS_WARNED_ABOUT_BIND_TRANSFORMS_NOT_HAVING_TYPE_CHECKING: boolean = false;
const BIND_TRANSFORMS_HAVE_NO_TYPE_CHECKING_MESSAGE: string =
    `Bind transforms cannot be checked for their types; as such, these checks will be ignored for bindings using them.`;
const BIND_TARGET_IS_MISSING_MESSAGE: string =
    `The bind target is missing.`;
const BIND_TARGET_IS_NOT_BINDABLE_MESSAGE: string =
    `The bind target must be marked with the @Bindable decorator.`;
const BIND_TARGET_IS_NOT_INITIALISED_MESSAGE: string =
    `The bind target's @Bindable decorator must be activated with the BindingService.init() call on the instance of the property to be bound.`;
const MISMATCHED_BINDING_TYPE_MESSAGE: string =
    `The types of the binding do not match. Check if the bind is correct, use type assertion or consider using a BindTransform.`;
const TWO_WAY_BINDINGS_DO_NOT_SUPPORT_BIND_TRANSFORMS_MESSAGE: string =
    `Two-way bindings do not support the use of bind transforms.`;

/**
 * The metadata key used for storing bindable property related information.
 */
const BINDABLE_METADATA: string = "__BindableMetadata";
/**
 * The metadata key used for storing bound property related information.
 */
const BOUND_METADATA: string = "__BindingMetadata";
/**
 * Metadata object stored for each bindable property.
 */
interface BindableMetadata {
    key: string | symbol;
    type: any;
}
/**
 * Metadata object stored for each bound property.
 */
interface BindMetadata {
    key: string | symbol;
    type: any;
    bindTarget: any;
    bindTargetKey: string | symbol;
    bindProps?: BindProps;
}

/**
 * Event of bind events.
 */
interface BindEvent<E> {
    /**
     * The object subscribed to the event.
     */
    subscriber: any;
    /**
     * The event handler to call on event invokation.
     */
    handler: BindEventHandler<E>;
}
/**
 * Event handler of bind events.
 */
type BindEventHandler<E> = (sender: any, event: BindEventArgs<E>) => void;
/**
 * Event arguments of bind events.
 */
interface BindEventArgs<T> {
    newValue: T;
}
/**
 * Event dispatcher of bind events.
 */
class BindEventDispatcher<E> {
    private events: BindEvent<E>[] = [];

    /**
     * Invoke an event on all subscribers.
     * @param sender The object sending the event.
     * @param event The event being sent.
     */
    public invoke(sender: any, event: BindEventArgs<E>): void {
        for (let h of this.events)
            h.handler(sender, event);
    }
    /**
     * Invoke an event on all subscribers except the one specified.
     * @param sender The object sending the event.
     * @param except The object to not invoke the event on.
     * @param event The event being sent.
     */
    public invokeExcept(sender: any, except: any, event: BindEventArgs<E>): void {
        for (let h of this.events)
            if (h.subscriber !== except)
                h.handler(sender, event);
    }

    /**
     * Subscribe to the event with a new event handler.
     * @param subscriber The object subscribing to the event.
     * @param handler The event handler to call on event invokation.
     */
    public on(subscriber: any, handler: BindEventHandler<E>): void {
        this.events.push({ subscriber, handler });
    }

    /**
     * Unsubsribe the objects handler from the event.
     * @param subscriber The object unsubscribing from the event.
     */
    public off(subscriber: any): void {
        const index = this.events.findIndex((v) => v.subscriber === subscriber);
        this.events.splice(index, 1);
    }
}

/**
 * Modes with which properties can be bound.
 */
export enum BindModes {
    /**
     * One-way binding mode in which only the bound property has to reflect the changes to the source property.
     */
    OneWay,
    /**
     * Two-way binding mode in which both properties are bound to each other.
     */
    TwoWay
}
/**
 * Action that takes place after a binding has completed an update operation.
 * @param target The target object instance of the update operation.
 * @param key The target property key of the update operation.
 */
export type BindAction = (target: any, key: string | symbol) => void;
/**
 * Function that transforms the bound data into a form consumable by the binding initiator.
 */
export type BindTransform<TIn, TOut> = (value: TIn) => TOut;

/**
 * Properties which describe the behaviour of the binding process.
 */
export interface BindProps {
    /**
     * The mode with which to bind the properties. Defaults to one-way.
     */
    bindMode?: BindModes;
    /**
     * The transform to apply to the original values throughout the binding process. Defaults to an empty transform.
     */
    bindTransform?: BindTransform<any, any>;
    /**
     * The action to take after the binding has completed an update operation. Defaults to the React bind action.
     */
    bindAction?: BindAction;
}

/**
 * Service class for establishing and maintaining binding relations between properties.
 */
export abstract class BindingService {
    /**
     * The default binding mode used for binding operations if nothing else is specified.
     */
    public static defaultBindMode: BindModes = BindModes.OneWay;
    /**
     * The default bind transform used for binding operations if nothing else is specified.
     */
    public static defaultBindTransform?: BindTransform<any, any> = undefined;
    /**
     * The default bind action used for binding operations if nothing else is specified.
     */
    public static defaultBindAction?: BindAction = ReactBind;

    /**
     * Initializes the Binding Service on this class instance. Required for activating all binding related decorators.
     * @param target The instance of the class.
     */
    public static init(target: any) {
        // TODO: Improve metadata discovery.
        const propertyKeys: string[] = Array.prototype.concat(
            Object.getOwnPropertyNames(target),
            Object.getOwnPropertyNames(Object.getPrototypeOf(target))
        );

        propertyKeys.forEach(key => {
            const bindable: BindableMetadata = Reflect.getMetadata(BINDABLE_METADATA, target, key);
            if (bindable) {
                BindingService.makeBindableAs(bindable.type, target, bindable.key);
            }

            const binding: BindMetadata = Reflect.getMetadata(BOUND_METADATA, target, key);
            if (binding) {
                BindingService.bindAs(binding.type, target, binding.key,
                    binding.bindTarget, binding.bindTargetKey,
                    binding.bindProps);
            }
        });
    }

    /**
     * Creates a binding between the target property and the bindTarget property.
     * @param target The source class instance of the binding relation.
     * @param key The source property key of the binding relation.
     * @param bindTarget The target class instance of the binding relation.
     * @param bindTargetKey The target roperty key of the binding relation.
     * @param bindProps The properties which describe the behaviour of the binding process.
     */
    public static bind(target: any, key: string | symbol, bindTarget: any, bindTargetKey: string | symbol, bindProps?: BindProps) {
        BindingService.bindAs(null, target, key, bindTarget, bindTargetKey, bindProps);
    }
    /**
     * Creates a binding between the target property and the bindTarget property (with manual type assertion).
     * @param type The source property type of the binding relation.
     * @param target The source class instance of the binding relation.
     * @param key The source property key of the binding relation.
     * @param bindTarget The target class instance of the binding relation.
     * @param bindTargetKey The target roperty key of the binding relation.
     * @param bindProps The properties which describe the behaviour of the binding process.
     */
    public static bindAs(type: any, target: any, key: string | symbol, bindTarget: any, bindTargetKey: string | symbol, bindProps?: BindProps) {
        if (!bindProps) bindProps = { };
        if (bindProps.bindMode === undefined) bindProps.bindMode = BindingService.defaultBindMode;
        if (bindProps.bindTransform === undefined) bindProps.bindTransform = BindingService.defaultBindTransform;
        if (bindProps.bindAction === undefined) bindProps.bindAction = BindingService.defaultBindAction;

        if (!BindingService.isDefined(bindTarget, bindTargetKey))
            throw new Error(BIND_TARGET_IS_MISSING_MESSAGE);
        if (!BindingService.isBindable(bindTarget, bindTargetKey))
            throw new Error(BIND_TARGET_IS_NOT_BINDABLE_MESSAGE);
        if (!BindingService.isInitialisedBindable(bindTarget, bindTargetKey))
            throw new Error(BIND_TARGET_IS_NOT_INITIALISED_MESSAGE);
        if (bindProps.bindMode == BindModes.TwoWay && bindProps.bindTransform)
            throw new Error(TWO_WAY_BINDINGS_DO_NOT_SUPPORT_BIND_TRANSFORMS_MESSAGE);

        const metadata: BindMetadata = Reflect.getMetadata(BOUND_METADATA, target, key);
        const bindTargetMetadata: BindableMetadata = Reflect.getMetadata(BINDABLE_METADATA, bindTarget, bindTargetKey);

        type = metadata && metadata.type ? metadata.type : type;
        const bindType = bindTargetMetadata.type;

        if (bindProps.bindTransform) {
            if (!HAS_WARNED_ABOUT_BIND_TRANSFORMS_NOT_HAVING_TYPE_CHECKING) {
                console.warn(BIND_TRANSFORMS_HAVE_NO_TYPE_CHECKING_MESSAGE);
                HAS_WARNED_ABOUT_BIND_TRANSFORMS_NOT_HAVING_TYPE_CHECKING = true;
            }
        } else if (type !== bindType && (type && bindType)) {
            throw new Error(MISMATCHED_BINDING_TYPE_MESSAGE);
        }

        delete target[key];

        const backingFieldKey = BindingService.getBindBackingFieldKey(key);
        Object.defineProperty(target, backingFieldKey, {
            writable: true,
            enumerable: true,
            configurable: true
        });
        // Initial value after binding
        target[backingFieldKey] = bindTarget[bindTargetKey];
        if (bindProps.bindAction)
            bindProps.bindAction(target, key);

        const getter = function(this: any) {
            const val = this[backingFieldKey];
            return val;
        }
        const setter = function(this: any, val: any) {
            // @ts-ignore
            if (bindProps.bindMode == BindModes.TwoWay) {
                const bindTargetBackingFieldKey = BindingService.getBindBackingFieldKey(bindTargetKey);
                bindTarget[bindTargetBackingFieldKey] = val;

                const event: BindEventDispatcher<any> = BindingService.getBindEventDispatcher(bindTarget, bindTargetKey);
                event.invoke(this, { newValue: val });
            }
        }

        Object.defineProperty(target, key, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true
        });

        const event: BindEventDispatcher<any> = BindingService.getBindEventDispatcher(bindTarget, bindTargetKey);
        event.on(target, function(sender, e) {
            // @ts-ignore
            const val = bindProps.bindTransform ? bindProps.bindTransform(e.newValue) : e.newValue;
            target[backingFieldKey] = val;

            // @ts-ignore
            if (bindProps.bindAction)
                // @ts-ignore
                bindProps.bindAction(target, key);
        });
    }

    /**
     * Sets a property up for being bindable. Required for all bind operations targeting this property.
     * @param target The class instance of the property to make bindable.
     * @param key The property key of the property to make bindable.
     */
    public static makeBindable(target: any, key: string | symbol) {
        BindingService.makeBindableAs(null, target, key);
    }
    /**
     * Sets a property up for being bindable (with manual type assertion). Required for all bind operations targeting this property.
     * @param type The type of the property to make bindable.
     * @param target The class instance of the property to make bindable.
     * @param key The property key of the property to make bindable.
     */
    public static makeBindableAs(type: any, target: any, key: string | symbol) {
        const val = target[key];

        delete target[key];

        const backingFieldKey = BindingService.getBindBackingFieldKey(key);
        Object.defineProperty(target, backingFieldKey, {
            value: val,
            writable: true,
            enumerable: true,
            configurable: true
        });

        const eventKey = BindingService.getBindEventDispatcherKey(key);
        Object.defineProperty(target, eventKey, {
            writable: true,
            enumerable: true,
            configurable: true
        });
        target[eventKey] = new BindEventDispatcher<any>();

        const getter = function(this: any) {
            const val = this[backingFieldKey];
            return val;
        };
        const setter = function(this: any, val: any) {
            this[eventKey] = this[eventKey] || new BindEventDispatcher<any>();
            const event: BindEventDispatcher<any> = this[eventKey];
            event.invoke(this, { newValue: val });

            this[backingFieldKey] = val;
        };

        Object.defineProperty(target, key, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true
        });
    }

    /**
     * Marks a property as available for binding.
     * @param target The class or instance of the property to mark bindable.
     * @param key The property key of the property to marl bindable.
     * @param type The type of the property to mark bindable.
     */
    public static markBindable(target: any, key: string | symbol, type: any) {
        type = Reflect.getMetadata("design:type", target, key) || type;
        if (!type) {
            if (!HAS_WARNED_ABOUT_MISSING_TYPE_ANNOTATIONS) {
                console.warn(MISSING_TYPE_ANNOTATIONS_MESSAGE);
                HAS_WARNED_ABOUT_MISSING_TYPE_ANNOTATIONS = true;
            }
        }

        const metadata: BindableMetadata = {
            key: key,
            type: type
        };
        Reflect.defineMetadata(BINDABLE_METADATA, metadata, target, key);
    }

    /**
     * Marks a property as bound to a bindable property.
     * @param target The class or instance of the property to mark bound.
     * @param key The property key of the property to mark bound.
     * @param type The type of the property to mark bound.
     * @param bindTarget The class or instance of the property to bind to.
     * @param bindTargetKey The property key of the property to bind to.
     * @param bindProps The properties which describe the behaviour of the binding process.
     */
    public static markBind(target: any, key: string | symbol, type: any, bindTarget: any, bindTargetKey: string | symbol, bindProps?: BindProps) {
        type = Reflect.getMetadata("design:type", target, key) || type;
        if (!type) {
            if (!HAS_WARNED_ABOUT_MISSING_TYPE_ANNOTATIONS) {
                console.warn(MISSING_TYPE_ANNOTATIONS_MESSAGE);
                HAS_WARNED_ABOUT_MISSING_TYPE_ANNOTATIONS = true;
            }
        }

        bindProps = bindProps || { bindMode: undefined, bindTransform: undefined, bindAction: undefined };
        const metadata: BindMetadata = {
            key: key,
            type: type,
            bindTarget: bindTarget,
            bindTargetKey: bindTargetKey,
            bindProps: {
                bindMode: bindProps.bindMode,
                bindTransform: bindProps.bindTransform,
                bindAction: bindProps.bindAction
            }
        };
        Reflect.defineMetadata(BOUND_METADATA, metadata, target, key);
    }

    /**
     * Checks wether the specified property is defined on the specified class or instance.
     * @param target The target class to check for.
     * @param key The target property key to check for.
     */
    private static isDefined(target: any, key: string | symbol): boolean {
        return key in target;
    }
    /**
     * Checks wether the specified property is marked with the @Bindable decorator.
     * @param target The target class to check for.
     * @param key The target property key to check for.
     */
    private static isBindable(target: any, key: string | symbol): boolean {
        const metadata: BindableMetadata = Reflect.getMetadata(BINDABLE_METADATA, target, key);
        return !!metadata;
    }
    /**
     * Checks wether the specified @Bindable property has been initialised with its bind event dispatcher.
     * @param target The target class to check for.
     * @param key The target property key to check for.
     */
    private static isInitialisedBindable(target: any, key: string | symbol): boolean {
        const event = BindingService.getBindEventDispatcher(target, key);
        return !!event;
    }

    /**
     * Gets the bind event dispatcher key of the specified @Bindable property.
     * @param key The property key of the property.
     */
    private static getBindEventDispatcherKey(key: string | symbol): string {
        return `__${String(key)}BindEvent`;
    }
    /**
     * Gets the bind event dispatcher of the specified @Bindable property.
     * @param target The class of the property.
     * @param key The property key of the property.
     */
    private static getBindEventDispatcher(target: any, key: string | symbol): BindEventDispatcher<any> {
        const eventKey = BindingService.getBindEventDispatcherKey(key);
        return target[eventKey];
    }

    /**
     * Gets the bind backing field key of the specified property.
     * @param key The property key of the property.
     */
    private static getBindBackingFieldKey(key: string | symbol): string {
        return `__${String(key)}BindValue`;
    }
}

/**
 * Marks a property as available for binding. Required for all bind operations targeting this property.
 * @param target The class of the property to make bindable.
 * @param key The property key of the property to make bindable.
 */
export function Bindable(target: any, key: string | symbol): void {
    return BindingService.markBindable(target, key, null);
}
/**
 * Marks a property as available for binding (with manual type assertion). Required for all bind operations targeting this property.
 * @param type The type of the property to make bindable.
 * @param target The class of the property to make bindable.
 * @param key The property key of the property to make bindable.
 */
export function BindableAs(type: any): (target: any, key: string | symbol) => void {
    return function(target: any, key: string | symbol): void {
        return BindingService.markBindable(target, key, type);
    }
}

/**
 * Denotes a binding between the annotated property and the specified property.
 * @param bindTarget The class or instance of the property to bind to.
 * @param bindTargetKey The target property key of the property to bind to.
 * @param bindMode The mode with which to bind the properties. Defaults to one-way.
 */
export function Bind(bindTarget: any, bindTargetKey: string, bindMode?: BindModes): (target: any, key: string) => void;
/**
 * Denotes a binding between the annotated property and the specified property.
 * @param bindTarget The class or instance of the property to bind to.
 * @param bindTargetKey The target property key of the property to bind to.
 * @param bindProps The properties which describe the behaviour of the binding process.
 */
export function Bind(bindTarget: any, bindTargetKey: string, bindProps?: BindProps): (target: any, key: string) => void;
export function Bind(bindTarget: any, bindTargetKey: string, bindMode_or_bindProps?: BindModes | BindProps) {
    return function(target: any, key: string): void {
        if (typeof bindMode_or_bindProps === "number") {
            BindingService.markBind(target, key, null, bindTarget, bindTargetKey, { bindMode: bindMode_or_bindProps as BindModes });
        } else {
            BindingService.markBind(target, key, null, bindTarget, bindTargetKey, bindMode_or_bindProps as BindProps);
        }
    }
}
/**
 * Denotes a binding between the annotated property and the specified property (with manual type assertion).
 * @param type The type of the property to bind.
 * @param bindTarget The class or instance of the property to bind to.
 * @param bindTargetKey The target property key of the property to bind to.
 * @param bindMode The mode with which to bind the properties. Defaults to one-way.
 */
export function BindAs(type: any, bindTarget: any, bindTargetKey: string, bindMode?: BindModes): (target: any, key: string | symbol) => void;
/**
 * Denotes a binding between the annotated property and the specified property (with manual type assertion).
 * @param type The type of the property to bind.
 * @param bindTarget The class or instance of the property to bind to.
 * @param bindTargetKey The target property key of the property to bind to.
 * @param bindProps The properties which describe the behaviour of the binding process.
 */
export function BindAs(type: any, bindTarget: any, bindTargetKey: string, bindProps?: BindProps): (target: any, key: string | symbol) => void;
export function BindAs(type: any, bindTarget: any, bindTargetKey: string, bindMode_or_bindProps?: BindModes | BindProps) {
    return function(target: any, key: string | symbol): void {
        if (typeof bindMode_or_bindProps === "number") {
            BindingService.markBind(target, key, type, bindTarget, bindTargetKey, { bindMode: bindMode_or_bindProps as BindModes });
        } else {
            BindingService.markBind(target, key, type, bindTarget, bindTargetKey, bindMode_or_bindProps as BindProps);
        }
    }
}

/**
 * The binding operation used for React components. The default implementation of BindAction.
 * @param target The component instance of the bind update operation.
 * @param key The target property key of the bind operation.
 */
export function ReactBind(target: any, key: string | symbol) {
    target.forceUpdate();
}