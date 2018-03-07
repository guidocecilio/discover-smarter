
import static org.junit.Assert.assertTrue;

import java.util.List;
import java.util.Map;

import processing.index.TypeIndex;
import cucumber.api.java.en.Given;
import cucumber.api.java.en.Then;
import cucumber.api.java.en.When;


public class TestOntologyMappingSteps {
	
	private String file;
	private String subjectUri;
	
	@Given("^there is a RDF file  \"([^\"]*)\"$")
	public void there_is_a_RDF_file(String file) throws Throwable {
	   TypeIndex.setPath("../discover-smarter/public/hdt/");
	   this.file = file;
	}

	@When("^I call the indexing service and lookup for subject uri \"([^\"]*)\"$")
	public void I_call_the_indexing_service_and_lookup_for_subject_uri(String subjectUri) throws Throwable {
		TypeIndex.build(file);
		this.subjectUri= subjectUri;
	}

	@Then("^I am returned a json list of types that include the following$")
	public void I_am_returned_a_json_list_of_types_that_include_the_following(List<String> list) throws Throwable {
		Map<String, List<String>> results = TypeIndex.getIndex(file);
		for(String s: results.get(subjectUri)){
			assertTrue(s,list.contains(s));
		}
	}
	
	@When("^I call the indexing service and lookup for subject uri \"([^\"]*)\" in min index$")
	public void I_call_the_indexing_service_and_lookup_for_subject_uri_in_min_index(String subjectUri) throws Throwable {
		TypeIndex.build(file);
		this.subjectUri= subjectUri;
	}

	@Then("^returned value for the type should be \"([^\"]*)\"$")
	public void returned_value_for_the_type_should_be(String value) throws Throwable {
	  assertTrue(value, TypeIndex.getMinIndex(file).get(this.subjectUri).equals("Person"));
	}


}
