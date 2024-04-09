import CallToAction from "../components/CallToAction";
import CallToAction2 from "../components/CallToAction2";
import CallToAction3 from "../components/CallToAction3";
import CallToAction4 from "../components/CallToAction4";
import CallToAction5 from "../components/CallToAction5";

export default function Projects() {
  return (
    <>
      <div className="gap-2">
        <div className="min-h-screen max-w-2xl mx-auto flex justify-center items-center flex-col gap-6 p-3">
          <h1 className="text-3xl font-semibold">Pojects</h1>
          <p className="text-md text-gray-500">
            Build fun and engaging projects while learning HTML, CSS, and
            JavaScript!
          </p>
          <p className="text-md text-blue-500 font-bold">
            Scroll down to Explore 👇
          </p>
        </div>
        <div className="mx-1.5 my-1.5">
          {/* <CallToAction /> */}
          <CallToAction2 />
          <CallToAction3 />
          <CallToAction4 />
          <CallToAction5 />
        </div>
      </div>
    </>
  );
}
