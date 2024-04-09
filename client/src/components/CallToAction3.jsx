import { Button } from "flowbite-react";
import amazon from "../assets/amazon.png";
export default function CallToAction3() {
  return (
    <div className="flex flex-col sm:flex-row p-3 border border-teal-500 justify-center items-center rounded-tl-3xl rounded-br-3xl text-center  m-4 my-6">
      <div className="flex-1 justify-center flex flex-col">
        <h2 className="text-2xl">Want to Master DOM in js ?</h2>
        <p className="text-gray-500 my-2">
          Checkout this one single project to master HTML + CSS (FOR BEGINNERS)
        </p>
        <Button
          gradientDuoTone="purpleToPink"
          className="rounded-tl-xl rounded-bl-none"
        >
          <a
            href="https://aakif9866.github.io/Amazon-Clone116/"
            target="_blank"
            rel="noopener noreferrer"
          >
            amazon clone
          </a>
        </Button>
      </div>
      <div className="p-7 flex-1">
        <img src={amazon} alt="amazon" />
      </div>
    </div>
  );
}
