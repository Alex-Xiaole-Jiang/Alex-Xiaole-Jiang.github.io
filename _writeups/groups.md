---
# meta: Annals of Physics 2026
---
Everyone has heard of entanglement, from your undergraduate physics friends to your coworker obsessed with popular science: "spooky action at a distance"! The fame is well deserved: entanglement is fundamental to our understanding of quantum phenomena. It also plays a central role in recent advances in quantum gravity, which we (I) care a lot about.

In this paper, we aim to investigate entanglement and propose a different way of thinking about it. A familiar way to characterize entanglement goes as follows. Pick your favorite pure state (vector) $\lvert\psi\rangle \in \mathcal{H}$, where $\mathcal{H}$ is the space of possible states (it's a vector space!). We divide the system into two parts, $A$ and $B$, so that $\mathcal{H} = \mathcal{H}_A \otimes \mathcal{H}_B$, and compute the *entanglement entropy*, $S_A$, across this division:

$$
S_A = -\operatorname{Tr}(\rho_A \log \rho_A).
$$

Here, $\rho_A$ describes the state of $A$ when we ignore $B$ (mathematically, we trace out subsystem $B$). For our pure state $\lvert\psi\rangle$, if this entropy is nonzero, we say the two parts are entangled; otherwise, they are not. In the latter case, the state is a *tensor product state*, $\lvert\psi\rangle = \lvert\psi_A\rangle \otimes \lvert\psi_B\rangle$.

We propose to instead think of entanglement as a property of the state that lets us perform some action on one part, $A$, and undo it with a corresponding action on the other part, $B$. Mathematically, we describe "doing something to parts of a state" using group actions. Here, these are unitary transformations (basically rotation matrices). Calling the two operations $g_A$ and $g_B$, we can translate the idea into math:

$$
 g_A \lvert\psi\rangle = g_B^{-1}\lvert\psi\rangle,
$$

where $g_A$ acts only on $A$, and $g_B$ acts only on $B$. In other words, acting on one side can have the same effect as acting on the other. Roughly speaking, collecting these coordinated transformations gives us the *entanglement group* of $\lvert\psi\rangle$.\* This lets us describe entanglement through the operations that different parts of a system can perform for one another.

Our prescription extends naturally to multipartite systems, capturing entanglement structure that entropy alone does not fully describe. Using this language, we propose a way to characterize and classify *multipartite entanglement*, show how monogamy of entanglement arises, identify this entanglement structure in a range of quantum algorithms and protocols, and extend the formulation to mixed states.

\* For the precise definition see our paper.
