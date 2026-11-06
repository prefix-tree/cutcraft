---
"@cutcraft/kit": minor
"@cutcraft/player": minor
---

Breaking: a keyframe that animates an effect param goes inside the `<Effect>`, with `param`: `<Effect id="plate" type="regionBlur"><Keyframe id="k1" param="box" at={0} value={[…]} /></Effect>`. `property="effect.<id>.<param>"` is removed, and its error shows the nested form. The resolver now checks that `param` is one of the effect's params and that the value fits it, where before a typo or a renamed effect detached the animation silently. `keyframe/add` takes `param` (on the effect) or `property` (on the element).
