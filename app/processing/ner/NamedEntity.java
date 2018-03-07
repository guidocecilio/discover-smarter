package processing.ner;


/**
 * NamedEntity class for representing a named entity 
 * @author waqar
 */

public class NamedEntity {
	
    private String name;
    private String type;

    public NamedEntity(String name, String type) {
        this.name = name;
        this.type = type;
    }

    /**
     * Returns the name of the entity 
     * @return the name
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the name for the entity
     * @param name the name to set
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Returns the type of entity 
     * @return the type
     */
    public String getType() {
        return type;
    }

    /**
     * Sets the type of the enity 
     * @param type the type to set
     */
    public void setType(String type) {
        this.type = type;
    }
}
