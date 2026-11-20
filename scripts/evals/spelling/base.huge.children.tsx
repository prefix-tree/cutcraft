import { Clip, Composition, Track } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={960} height={540}>
      <Track id="main">
        <Clip id="s00" src="asset:coffeeWide" in={0} out={2} fit="cover" />
        <Clip id="s01" src="asset:espresso" in={1} out={3.5} fit="cover" />
        <Clip id="s02" src="asset:redCup" in={2} out={5} fit="cover" />
        <Clip id="s03" src="asset:coffee" in={3} out={5} fit="cover" />
        <Clip id="s04" src="asset:coffeeWide" in={4} out={6.5} fit="cover" />
        <Clip id="s05" src="asset:espresso" in={0} out={3} fit="cover" />
        <Clip id="s06" src="asset:redCup" in={1} out={3} fit="cover" />
        <Clip id="s07" src="asset:coffee" in={2} out={4.5} fit="cover" />
        <Clip id="s08" src="asset:coffeeWide" in={3} out={6} fit="cover" />
        <Clip id="s09" src="asset:espresso" in={4} out={6} fit="cover" />
        <Clip id="s10" src="asset:redCup" in={0} out={2.5} fit="cover" />
        <Clip id="s11" src="asset:coffee" in={1} out={4} fit="cover" />
        <Clip id="s12" src="asset:coffeeWide" in={2} out={4} fit="cover" />
        <Clip id="s13" src="asset:espresso" in={3} out={5.5} fit="cover" />
        <Clip id="s14" src="asset:redCup" in={4} out={7} fit="cover" />
        <Clip id="s15" src="asset:coffee" in={0} out={2} fit="cover" />
        <Clip id="s16" src="asset:coffeeWide" in={1} out={3.5} fit="cover" />
        <Clip id="s17" src="asset:espresso" in={2} out={5} fit="cover" />
        <Clip id="s18" src="asset:redCup" in={3} out={5} fit="cover" />
        <Clip id="s19" src="asset:coffee" in={4} out={6.5} fit="cover" />
      </Track>
    </Composition>
  );
}
