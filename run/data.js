const register = []

function p(name, age) {
    register[name] = {name: name, age: age, friends: []}
}

function makeFriends(nameOne, nameTwo) {
    const pOne = register[nameOne]
    const pTwo = register[nameTwo]
    if(!pOne || !pTwo) {
        return
    }
    pOne.friends.push(pTwo)
    pTwo.friends.push(pOne)
}

p("Fred", 46)
p("Peter", 43)
makeFriends("Fred", "Peter")

module.exports = {
    person: ({name}) => {
        return register[name]
    },
    addPerson: ({person}) => {
        if(register[person.name]) {
            return null
        } else {
            register[person.name] = person
            if(person.friends) {
                const tmp = person.friends
                person.friends = []
                for(friend of tmp) {
                    makeFriends(person.name, friend)
                }
            } else {
                person.friends = []
            }
            return person
        }
    }
}