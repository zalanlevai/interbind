# interbind

[![latest release][release-src]][release-href]
[![npm version][npm-src]][npm-href]
[![minified size][minified-src]][minified-href]
[![license][license-src]][license-href]

A binding and event library useful for implementing the MVC pattern for *JavaScript/TypeScript*.

**WARNING: This library is in early stages of development. Breaking API changes are expected to happen. See the GitHub [issues][issues-href] for more information.**

## Binding

Binding is the process of establishing a connection between two properties. They are an event-based data flow abstraction managed by the `BindingService` class and its exposed decorators.

**NOTE: The behaviour and function of bindings are similar to [data binding in WPF][mdocs-wpf-databinding-href].**

Bindings are made up of **two components**:
- A `bindable`, which is the source property in the binding relation. It can have multiple properties targeting it as their source.
- A `bound` which is a replica of the *bindable* property it targets.

Additionally, each binding has a number of *optional* **arguments** to configure its behaviour. These include:
- the **mode** with which to bind properties.
  - *One-way* binding causes changes to the `bindable` property to automatically update the `bound` property, but changes targeting the `bound` property are not propegated back to the `bindable` property.
  - *Two-way* binding causes changes to either the `bindable` property or the `bound` property to automatically update the other.
- the **action** which allows the class of the `bound` property to respond to changes *(e.g. refresing a view)*.
- the **transform** to use on the `bindable` data when updating the `bound` property. *(Only available on one-way bindings.)*

### Usage

Import the binding components of the library you would like to use.
```TypeScript
import { /* BindingService, Bindable, Bind, etc. */ } from "interbind";
```

#### bindable

A `bindable` can be created in the following ways:
- declaratively using a *TypeScript* decorator:
```TypeScript
class Source {
    @Bindable
    public text?: string;
}
```
- imperatively using the `BindingService` class:<br>
**NOTE: The imperative definition of binding components is subject to change in the very near future.**
```TypeScript
class Source {
    public text?: string;

    constructor() {
        BindingService.markBindable(this, "text", String);
        BindingService.makeBindable(this, "text");
    }
}
```

#### bound

A `bound` can be created similarly, using either a declarative or imperative syntax. For example, a binding to an instance of the previously defined *bindable* would look like this:
- delaratively using the *TypeScript* decorator:<br>
**NOTE: The use of the `BindingService.init()` call is mandatory to initialize all `bound` properties declared using decorators.** *(Static properties reside on their class and thus have to be initialised seperately from instanced properties.)*
```TypeScript
let src: Source = new Source();

class Replica {
    @Bind(src, "text")
    public text?: string;

    constructor() {
        BindingService.init(this);
    }
}
```
- imperatively using the `BindingService` class:
```TypeScript
let src: Source = new Source();

class Replica {
    public text?: string;

    constructor() {
        BindingService.bind(this, "text", src, "text");
    }
}
```

#### Example

Here is an example for use with a React component (and corresponding backing store):

```TypeScript
import { BindingService, Bindable, Bind, ReactBind } from "interbind";

BindingService.defaultBindAction = ReactBind;

public class User {
    public username: string;
}

public abstract class UserManager {
    @Bindable
    public static currentUser: User;
}

public class Navigation extends React.Component<any, any> {
    @Bind(UserManager, "currentUser")
    private user: User;

    componentDidMount() {
        BindingService.init(this);
    }

    render() {
        return (
            <div>{this.user ? this.user.username : "login"}</div>
        )
    }
}
```

[release-src]: https://badgen.net/github/release/zalanlevai/interbind
[release-href]: https://github.com/zalanlevai/interbind/releases
[npm-src]: https://badgen.net/npm/v/interbind
[npm-href]: https://npmjs.org/package/interbind
[minified-src]: https://badgen.net/bundlephobia/min/interbind
[minified-href]: https://bundlephobia.com/result?p=interbind
[license-src]: https://badgen.net/github/license/zalanlevai/interbind
[license-href]: https://github.com/zalanlevai/interbind/blob/master/LICENSE

[issues-href]: https://github.com/zalanlevai/interbind/issues

[mdocs-wpf-databinding-href]: https://docs.microsoft.com/en-us/dotnet/framework/wpf/data/data-binding-overview
