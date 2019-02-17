import { BindingService, Bindable, BindableAs, Bind, BindAs, BindModes } from "../src/Binding";

BindingService.defaultBindAction = undefined;

class TestBindables {
    @Bindable
    public instancedWithoutValue?: string;
    @Bindable
    public instancedWithValue: string = "default";
    @Bindable
    public static staticWithoutValue: string;
    @Bindable
    public static staticWithValue: string = "default";

    public notAnnotated?: string;

    @Bindable
    public twoWay: string = "default";
    @Bindable
    public twoWayMulti: string = "default";
}
let tBindables: TestBindables = new TestBindables();

class TestBinds {
    @Bind(tBindables, "instancedWithoutValue")
    public instancedWithoutValue?: string;
    @Bind(tBindables, "instancedWithValue")
    public instancedWithValue?: string = "not me";
    @Bind(TestBindables, "staticWithoutValue")
    public static staticWithoutValue?: string;
    @Bind(TestBindables, "staticWithValue")
    public static staticWithValue?: string = "not me";

    @Bind(tBindables, "instancedWithValue")
    public instancedToInstanced?: string;
    @Bind(TestBindables, "staticWithValue")
    public instancedToStatic?: string;
    @Bind(tBindables, "instancedWithValue")
    public static staticToInstanced?: string;
    @Bind(TestBindables, "staticWithValue")
    public static staticToStatic?: string;

    public notAnnotated?: string;

    @Bind(tBindables, "twoWay", BindModes.TwoWay)
    public twoWay?: string;
    @Bind(tBindables, "twoWayMulti", BindModes.TwoWay)
    public twoWayMultiTwoWay1?: string;
    @Bind(tBindables, "twoWayMulti", BindModes.TwoWay)
    public twoWayMultiTwoWay2?: string;
    @Bind(tBindables, "twoWayMulti", BindModes.OneWay)
    public twoWayMultiOneWay?: string;

    public static mockAction: jest.Mock<any, any> = jest.fn();
    @Bind(TestBindables, "staticWithValue", { bindAction: TestBinds.mockAction, bindMode: BindModes.TwoWay })
    public static actionBound?: string;
    public static mockTransform: jest.Mock<any, any> = jest.fn();
    @Bind(TestBindables, "staticWithValue", { bindTransform: TestBinds.mockTransform })
    public static transformBound?: string;

    constructor() { BindingService.init(this); BindingService.init(TestBinds); }
}
let tBinds: TestBinds = new TestBinds();

class InvalidClassRequest {
    @Bind(tBindables, "staticWithValue")
    public static bind?: string;
}
class InvalidPropertyRequest {
    @Bind(TestBindables, "stticWithValue")
    public static bind?: string;
}
class InvalidTwoWayTransformed {
    @Bind(TestBindables, "staticWithValue", { bindMode: BindModes.TwoWay, bindTransform: (x) => x })
    public static bind?: string;
}

// #region Initialization
test("Bindable property without value initialized", () => {
    expect(tBindables).toHaveProperty("instancedWithoutValue");
    expect(tBindables).toHaveProperty("__instancedWithoutValueBindValue");
    expect(tBindables).toHaveProperty("__instancedWithoutValueBindEvent");
});
test("Bindable property with value initialized", () => {
    expect(tBindables).toHaveProperty("instancedWithValue");
    expect(tBindables).toHaveProperty("__instancedWithValueBindValue");
    expect(tBindables).toHaveProperty("__instancedWithValueBindEvent");

    expect(tBindables.instancedWithValue).toBe("default");
});
test("Static bindable property without value initilaized", () => {
    expect(TestBindables).toHaveProperty("staticWithoutValue");
    expect(TestBindables).toHaveProperty("__staticWithoutValueBindValue");
    expect(TestBindables).toHaveProperty("__staticWithoutValueBindEvent");
});
test("Static bindable property with value initialized", () => {
    expect(TestBindables).toHaveProperty("staticWithValue");
    expect(TestBindables).toHaveProperty("__staticWithoutValueBindValue");
    expect(TestBindables).toHaveProperty("__staticWithoutValueBindEvent");

    expect(TestBindables.staticWithValue).toBe("default");
});

test("Bound property without value initialized", () => {
    expect(tBinds).toHaveProperty("instancedWithoutValue");
    expect(tBinds).toHaveProperty("__instancedWithoutValueBindValue");
});
test("Bound property with value initialized", () => {
    expect(tBinds).toHaveProperty("instancedWithValue");
    expect(tBinds).toHaveProperty("__instancedWithValueBindValue");

    expect(tBinds.instancedWithValue).toBe("default");
});
test("Static bound property without value initialized", () => {
    expect(TestBinds).toHaveProperty("staticWithoutValue");
    expect(TestBinds).toHaveProperty("__staticWithoutValueBindValue");
});
test("Static bound property with value initialized", () => {
    expect(TestBinds).toHaveProperty("staticWithValue");
    expect(TestBinds).toHaveProperty("__staticWithValueBindValue");

    expect(TestBinds.staticWithValue).toBe("default");
});

test("Instanced property bound to instanced property", () => {
    expect(tBindables).toHaveProperty("instancedWithValue");
    expect(tBindables).toHaveProperty("__instancedWithValueBindValue");
    expect(tBindables).toHaveProperty("__instancedWithValueBindEvent");
    expect(tBindables.instancedWithValue).toBe("default");

    expect(tBinds).toHaveProperty("instancedToInstanced");
    expect(tBinds).toHaveProperty("__instancedToInstancedBindValue");
    expect(tBinds.instancedToInstanced).toBe("default");
});
test("Instanced property bound to static property", () => {
    expect(TestBindables).toHaveProperty("staticWithValue");
    expect(TestBindables).toHaveProperty("__staticWithoutValueBindValue");
    expect(TestBindables).toHaveProperty("__staticWithoutValueBindEvent");
    expect(TestBindables.staticWithValue).toBe("default");

    expect(tBinds).toHaveProperty("instancedToStatic");
    expect(tBinds).toHaveProperty("__instancedToStaticBindValue");
    expect(tBinds.instancedToInstanced).toBe("default");
});
test("Static property bound to instanced property", () => {
    expect(tBindables).toHaveProperty("instancedWithValue");
    expect(tBindables).toHaveProperty("__instancedWithValueBindValue");
    expect(tBindables).toHaveProperty("__instancedWithValueBindEvent");
    expect(tBindables.instancedWithValue).toBe("default");

    expect(TestBinds).toHaveProperty("staticToInstanced");
    expect(TestBinds).toHaveProperty("__staticToInstancedBindValue");
    expect(TestBinds.staticToInstanced).toBe("default");
});
test("Static property bound to static property", () => {
    expect(TestBindables).toHaveProperty("staticWithValue");
    expect(TestBindables).toHaveProperty("__staticWithoutValueBindValue");
    expect(TestBindables).toHaveProperty("__staticWithoutValueBindEvent");
    expect(TestBindables.staticWithValue).toBe("default");

    expect(TestBinds).toHaveProperty("staticToStatic");
    expect(TestBinds).toHaveProperty("__staticToStaticBindValue");
    expect(TestBinds.staticToStatic).toBe("default");
});

test("Programatic bindable initialization", () => {
    BindingService.markBindable(tBindables, "notAnnotated", null);
    BindingService.makeBindable(tBindables, "notAnnotated");

    expect(tBindables).toHaveProperty("notAnnotated");
    expect(tBindables).toHaveProperty("__notAnnotatedBindValue");
    expect(tBindables).toHaveProperty("__notAnnotatedBindEvent");
});
test("Programatic bind initialization", () => {
    tBindables.notAnnotated = "default";
    BindingService.bind(tBinds, "notAnnotated", tBindables, "notAnnotated");

    expect(tBinds).toHaveProperty("notAnnotated");
    expect(tBinds).toHaveProperty("__notAnnotatedBindValue");
    expect(tBinds.notAnnotated).toBe("default");
});

test("Invalid binds throw", () => {
    expect(() => BindingService.init(InvalidClassRequest)).toThrow();
    expect(() => BindingService.init(InvalidPropertyRequest)).toThrow();

    expect(() => BindingService.bind(null, "", null, "", {  })).toThrow();
    expect(() => BindingService.bind(TestBinds, "staticWithValue", null, "", {  })).toThrow();
    expect(() => BindingService.bind(null, "", TestBindables, "staticWithValue", {  })).toThrow();
});
// #endregion

// #region Data Exchange
test("Two-way binding refreshes bound property", () => {
    tBinds.twoWay = "exchanged";
    expect(tBindables.twoWay).toBe("exchanged");
});

test("Two-way binding composition on a single bindable", () => {
    tBinds.twoWayMultiTwoWay1 = "exchanged1";
    expect(tBindables.twoWayMulti).toBe("exchanged1");
    expect(tBinds.twoWayMultiTwoWay2).toBe("exchanged1");
    expect(tBinds.twoWayMultiOneWay).toBe("exchanged1");

    tBinds.twoWayMultiTwoWay2 = "exchanged2";
    expect(tBindables.twoWayMulti).toBe("exchanged2");
    expect(tBinds.twoWayMultiTwoWay1).toBe("exchanged2");
    expect(tBinds.twoWayMultiOneWay).toBe("exchanged2");
});

test("One-way bound property can't be set", () => {
    tBindables.twoWayMulti = "default";

    tBinds.twoWayMultiOneWay = "exchanged";
    expect(tBinds.twoWayMultiOneWay).toBe("default");
    expect(tBindables.twoWayMulti).toBe("default");
    expect(tBinds.twoWayMultiTwoWay1).toBe("default");
    expect(tBinds.twoWayMultiTwoWay2).toBe("default");
});
// #endregion

// #region Bind Arguments
test("Bind action called on initialization", () => {
    expect(TestBinds.mockAction).toBeCalled();
});
test("Bind action called on value change", () => {
    TestBindables.staticWithValue = "action";
    expect(TestBinds.mockAction).toBeCalled();
});
test("Bind action called on self-incurred value change", () => {
    TestBinds.actionBound = "self";
    expect(TestBinds.mockAction).toBeCalled();
});

test("Bind transform called on initialization", () => {
    expect(TestBinds.mockTransform).toBeCalled();
});
test("Bind transform called on value change", () => {
    TestBindables.staticWithValue = "transform";
    expect(TestBinds.mockTransform).toBeCalled();
});

test("Two-way bind with transform throws", () => {
    expect(() => BindingService.init(InvalidTwoWayTransformed)).toThrow();
});
// #endregion
