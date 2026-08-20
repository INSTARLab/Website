---
title: "Formal Methods and Trust in Safety-Critical Software"
description: "An INSTAR Lab research brief on formal verification for safety-critical and high-assurance software—and why testing alone cannot establish correctness."
publishedAt: 2026-07-09
draft: false
authors:
  - instar-editorial
topics:
  - formal methods
  - verification
  - safety-critical software
slug: formal-methods-safety-critical-trust
hero:
  src: /img/pages/formal-methods/hero.avif
  alt: Abstract representation of formal verification and mathematical proof for software correctness
  caption: A proof is a different kind of assurance than a passing test suite.
readingMap:
  - label: Why testing is not enough
    summary: The difference between sampled behavior and a checked specification.
    anchor: why-testing-isnt-enough
  - label: Where the stakes are highest
    summary: The systems where “probably” is not an acceptable standard.
    anchor: where-the-stakes-are-highest
  - label: INSTAR’s research interest
    summary: Extending machine-checkable assurance to newer system classes.
    anchor: why-instar-studies-formal-verification
takeaways:
  - Testing samples behavior; formal verification constructs an argument about every allowed input.
  - The specification itself must be precise enough to prove.
  - Open benchmarks make verification claims inspectable by other researchers.
limitations:
  - Formal methods do not make an incorrect or incomplete specification correct.
  - Proof can be slower and more demanding than testing, especially for systems that combine learned and hand-written components.
---

Testing can show that software fails; it can never show that software is correct in every case a specification allows. Formal methods close that gap by treating a program, protocol, or hardware design as a mathematical object whose properties can be proven—a discipline that matters most where the cost of an undetected defect is highest.

## Why testing isn’t enough

Conventional software testing samples a program’s behavior: run it against a set of inputs, check the outputs, and infer that untested cases probably behave similarly. For most software, that inference is a reasonable bet. For flight control software, medical device firmware, cryptographic implementations, and distributed consensus protocols, “probably” is not the standard the situation demands.

Formal verification treats the system as a precisely specified mathematical object and constructs an argument, checked step by step by a machine, that the system satisfies its specification for every input the specification allows. Interactive theorem provers and automated SMT solvers break a large correctness claim into smaller proof obligations. The process is more demanding than writing tests, and it requires the specification itself to be stated with unusual precision—but the guarantee is categorically different from a passing test suite.

## Where the stakes are highest

Safety-critical software is defined less by industry than by consequence: any system whose failure can cause injury, loss of life, or compromise infrastructure the public depends on. Aviation flight-control systems, implantable medical device firmware, industrial control systems, and cryptographic primitives all sit in this category.

The open research problem is extending verification to systems that increasingly incorporate concurrent behavior, probabilistic components, and learned models whose internal logic resists traditional specification. A distributed system with subtle message-interleaving bugs or a control system that includes machine learning both stretch classical proof techniques past their original design.

## Why INSTAR studies formal verification

INSTAR’s interest in formal methods sits within a technology program studying theorem proving, model checking, abstract interpretation, and type theory as complementary routes to an argument for correctness that survives scrutiny by a machine-checkable proof assistant.

As with our other technical programs, this work is built on standardized, publicly available foundations: published aerospace verification case studies, standardized cryptographic specifications, and open software-verification benchmarks. A proof that no one else can inspect is not much better than an unverified claim.
